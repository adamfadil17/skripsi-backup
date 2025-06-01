import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import type { ConversationMessage } from "@/types/types";

export const useMessages = (workspaceId: string) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoading(true);

        const response = await axios.get(
          `/api/workspace/${workspaceId}/conversation/messages`
        );

        const messagesArray = response.data.data.messages;

        if (Array.isArray(messagesArray)) {
          const processedData = messagesArray.map(
            (message: ConversationMessage) => {
              if (message.isDeleted) {
                return {
                  ...message,
                  body: "This message has been deleted",
                };
              }
              return {
                ...message,
                isEdited: message.isEdited || false,
                editedAt: message.editedAt || null,
              };
            }
          );
          setMessages(processedData);
        } else {
          console.error("Expected messages array, got:", messagesArray);
          setMessages([]);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        setMessages([]);
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
        const response = await axios.post(
          `/api/workspace/${workspaceId}/conversation/messages`,
          { body, image }
        );

        return response.data.data.message;
      } catch (error) {
        console.error("Error sending message:", error);
        return null;
      }
    },
    [workspaceId]
  );

  const editMessage = useCallback(
    async (messageId: string, body: string) => {
      try {
        const response = await axios.put(
          `/api/workspace/${workspaceId}/conversation/messages/${messageId}`,
          { body }
        );

        const updatedMessage = response.data.data.message;

        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  body,
                  isEdited: true,
                  editedAt: new Date(),
                }
              : msg
          )
        );

        return updatedMessage;
      } catch (error) {
        console.error("Error editing message:", error);
        return null;
      }
    },
    [workspaceId]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        const response = await axios.delete(
          `/api/workspace/${workspaceId}/conversation/messages/${messageId}`
        );

        const deletedMessage = response.data.data.message;

        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  isDeleted: true,
                  deletedAt: new Date(),
                  body: "This message has been deleted",
                }
              : msg
          )
        );

        return deletedMessage;
      } catch (error) {
        console.error("Error deleting message:", error);
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
