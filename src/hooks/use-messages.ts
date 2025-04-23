import { useState, useEffect, useCallback } from 'react';
import type { ConversationMessage } from '@/types/types';

export const useMessages = (workspaceId: string) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/workspace/${workspaceId}/conversation/messages`
        );
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (workspaceId) {
      fetchMessages();
    }
  }, [workspaceId]);

  // Send message function
  const sendMessage = useCallback(
    async (body: string, image?: string | null) => {
      try {
        const response = await fetch(
          `/api/workspace/${workspaceId}/conversation/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ body, image }),
          }
        );

        if (response.ok) {
          const newMessage = await response.json();
          // We don't need to update messages state here as it will come through Pusher
        }
      } catch (error) {
        console.error('Error sending message:', error);
      }
    },
    [workspaceId]
  );

  return {
    messages,
    setMessages,
    isLoading,
    sendMessage,
  };
};
