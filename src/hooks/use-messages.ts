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
          // Process both deleted and edited messages for consistency
          const processedData = data.map((message: ConversationMessage) => {
            if (message.isDeleted) {
              return {
                ...message,
                body: 'This message has been deleted',
              };
            }
            // Keep edited messages as they are but ensure the properties are present
            return {
              ...message,
              isEdited: message.isEdited || false,
              editedAt: message.editedAt || null,
            };
          });
          setMessages(processedData);
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
          // Return the new message so we can update our optimistic UI
          return newMessage;
        }
        return null;
      } catch (error) {
        console.error('Error sending message:', error);
        return null;
      }
    },
    [workspaceId]
  );

  // Edit message function
  const editMessage = useCallback(
    async (messageId: string, body: string) => {
      try {
        const response = await fetch(
          `/api/workspace/${workspaceId}/conversation/messages/${messageId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ body }),
          }
        );

        if (response.ok) {
          const updatedMessage = await response.json();
          // Return the updated message for optimistic UI updates
          return updatedMessage;
        }
        return null;
      } catch (error) {
        console.error('Error editing message:', error);
        return null;
      }
    },
    [workspaceId]
  );

  // Delete message function
  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        const response = await fetch(
          `/api/workspace/${workspaceId}/conversation/messages/${messageId}`,
          {
            method: 'DELETE',
          }
        );

        if (response.ok) {
          const deletedMessage = await response.json();

          // Update messages state untuk langsung menampilkan pesan terhapus
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    isDeleted: true,
                    deletedAt: new Date(),
                    body: 'This message has been deleted',
                  }
                : msg
            )
          );

          return deletedMessage;
        }
        return null;
      } catch (error) {
        console.error('Error deleting message:', error);
        return null;
      }
    },
    [workspaceId]
  );

  return {
    messages,
    setMessages,
    isLoading,
    sendMessage,
    editMessage,
    deleteMessage,
  };
};
