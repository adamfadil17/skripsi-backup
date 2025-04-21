'use client';

import { useEffect, useState } from 'react';
import { find } from 'lodash';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import type { ConversationMessage } from '@/types/types';
import { usePusherChannelContext } from '@/app/workspace/[workspaceid]/components/PusherChannelProvider';

export const useMessages = (workspaceId: string) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { channel } = usePusherChannelContext();
  const { data: session } = useSession();
  const currentUser = session?.user;

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!workspaceId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `/api/workspace/${workspaceId}/conversation/messages`
        );
        setMessages(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching messages:', error);
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [workspaceId]);

  // Mark messages as seen
  useEffect(() => {
    if (!currentUser?.email || messages.length === 0 || !workspaceId) return;

    const lastMessage = messages[messages.length - 1];

    // If the last message is not from the current user and hasn't been seen by the current user
    if (
      lastMessage.sender.email !== currentUser.email &&
      !lastMessage.seenIds.includes(currentUser.email)
    ) {
      axios.post(`/api/workspace/${workspaceId}/conversation/seen`, {
        messageId: lastMessage.id,
      });
    }
  }, [messages, currentUser?.email, workspaceId]);

  // Listen for new messages
  useEffect(() => {
    if (!channel) return;

    const newMessageHandler = (message: ConversationMessage) => {
      setMessages((current) => {
        if (find(current, { id: message.id })) {
          return current;
        }

        return [...current, message];
      });
    };

    const updateMessageHandler = (updatedMessage: ConversationMessage) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === updatedMessage.id ? updatedMessage : message
        )
      );
    };

    channel.bind('messages:new', newMessageHandler);
    channel.bind('messages:update', updateMessageHandler);

    return () => {
      channel.unbind('messages:new', newMessageHandler);
      channel.unbind('messages:update', updateMessageHandler);
    };
  }, [channel]);

  // Send a message
  const sendMessage = async (body: string, image?: string) => {
    if (!workspaceId) return;

    try {
      await axios.post(`/api/workspace/${workspaceId}/conversation/messages`, {
        body,
        image,
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return {
    messages,
    isLoading,
    sendMessage,
  };
};
