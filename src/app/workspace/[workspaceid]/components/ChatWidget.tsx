"use client";

import type React from "react";
import type { User } from "@prisma/client";

import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Send,
  CheckCheck,
  Check,
  X,
  Edit2,
  Trash2,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMessages } from "@/hooks/use-messages";
import type {
  WorkspaceMember,
  WorkspaceInfo,
  ConversationMessage,
} from "@/types/types";
import {
  PusherChannelProvider,
  usePusherChannelContext,
} from "./PusherChannelProvider";
import useActiveList from "@/hooks/use-active-list";
import { CldUploadButton } from "next-cloudinary";
import { format } from "date-fns";

interface ChatWidgetProps {
  workspaceId: string;
  currentUser: User;
  workspaceInfo?: WorkspaceInfo;
  members?: WorkspaceMember[];
}

interface MessageWithStatus extends ConversationMessage {
  sendStatus?: "sending" | "sent" | "seen";
  isEditing?: boolean;
  editedAt?: Date | null;
  isDeleted?: boolean;
  deletedAt?: Date | null;
}

function ChatWidgetContent({
  workspaceId,
  currentUser,
  workspaceInfo,
  members,
}: ChatWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [input, setInput] = useState("");
  const [imageToSend, setImageToSend] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [localWorkspaceInfo, setLocalWorkspaceInfo] = useState<
    WorkspaceInfo | undefined
  >(workspaceInfo);
  const [editText, setEditText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const { members: activeMembers } = useActiveList();
  const { channel } = usePusherChannelContext();
  const [localMessages, setLocalMessages] = useState<MessageWithStatus[]>([]);

  const {
    messages,
    setMessages,
    isLoading: isMessagesLoading,
    sendMessage,
    editMessage,
    deleteMessage,
  } = useMessages(workspaceId);

  useEffect(() => {
    setLocalWorkspaceInfo(workspaceInfo);
  }, [workspaceInfo]);

  useEffect(() => {
    if (messages.length > 0) {
      const updatedMessages = messages.map((message) => {
        let status: "sending" | "sent" | "seen" = "sent";

        if (
          message.sender.email === currentUser.email &&
          message.seenIds.length > 1
        ) {
          status = "seen";
        }

        return {
          ...message,
          body: message.isDeleted
            ? "This message has been deleted"
            : message.body,
          sendStatus: status,
          isEdited: message.isEdited || false,
          editedAt: message.editedAt || null,
          isDeleted: message.isDeleted || false,
          deletedAt: message.deletedAt || null,
        };
      });

      setLocalMessages(updatedMessages);
    }
  }, [messages, currentUser.email]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !imageToSend) || !workspaceId) return;

    const optimisticMessage: MessageWithStatus = {
      id: Date.now().toString(),
      body: input,
      image: imageToSend || null,
      conversationId: "",
      senderId: currentUser.id,
      createdAt: new Date(),
      seenIds: [currentUser.id],
      seenBy: [
        {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
        },
      ],
      sender: {
        id: currentUser.id,
        name: currentUser.name || "",
        email: currentUser.email || "",
        image: currentUser.image || null,
      },
      sendStatus: "sending",
      isEdited: false,
      isDeleted: false,
    };

    setLocalMessages((prev) => [...prev, optimisticMessage]);

    try {
      const sentMessage = await sendMessage(input, imageToSend);
      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticMessage.id
            ? { ...msg, id: sentMessage?.id || msg.id, sendStatus: "sent" }
            : msg
        )
      );
    } catch (error) {
      console.error("Failed to send message:", error);
    }

    setInput("");
    setImageToSend(null);
  };

  const startEditMessage = (message: MessageWithStatus) => {
    const now = new Date();
    const messageTime = new Date(message.createdAt);
    const diffInMinutes = (now.getTime() - messageTime.getTime()) / (1000 * 60);

    if (diffInMinutes > 2) {
      alert("Edit time window expired (2 minutes)");
      return;
    }

    setEditingMessageId(message.id);
    setEditText(message.body || "");

    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
      }
    }, 0);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  const saveEditedMessage = async () => {
    if (!editingMessageId || !editText.trim()) {
      setEditingMessageId(null);
      setEditText("");
      return;
    }

    const now = new Date();

    setLocalMessages((prev) =>
      prev.map((msg) =>
        msg.id === editingMessageId
          ? {
              ...msg,
              body: editText,
              isEdited: true,
              editedAt: now,
            }
          : msg
      )
    );

    try {
      await editMessage(editingMessageId, editText);
    } catch (error) {
      console.error("Failed to edit message:", error);
      alert("Failed to edit message");

      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg.id === editingMessageId
            ? {
                ...msg,
                body: msg.body,
                isEdited: false,
                editedAt: null,
              }
            : msg
        )
      );
    } finally {
      setEditingMessageId(null);
      setEditText("");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!messageId) return;

    if (!confirm("Are you sure you want to delete this message?")) {
      return;
    }

    setLocalMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              body: "This message has been deleted",
              isDeleted: true,
              deletedAt: new Date(),
            }
          : msg
      )
    );

    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error("Failed to delete message:", error);
      alert("Failed to delete message");

      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                body: msg.body,
                isDeleted: false,
                deletedAt: null,
              }
            : msg
        )
      );
    }
  };

  const handleUpload = (result: any, options: any) => {
    if (result?.info?.secure_url) {
      setImageToSend(result.info.secure_url);
    }
  };

  const cancelImageUpload = () => {
    setImageToSend(null);
  };

  const markMessageAsSeen = async (messageId: string) => {
    try {
      await fetch(`/api/workspace/${workspaceId}/conversation/seen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messageId }),
      });
    } catch (error) {
      console.error("Error marking message as seen:", error);
    }
  };

  useEffect(() => {
    if (!channel) return;

    const handleWorkspaceUpdated = (updatedWorkspace: any) => {
      setLocalWorkspaceInfo((prev) => {
        if (!prev) return updatedWorkspace;

        const updated = {
          ...prev,
          ...updatedWorkspace,
        };

        return updated;
      });
    };

    channel.bind("workspace-updated", handleWorkspaceUpdated);

    return () => {
      channel.unbind("workspace-updated", handleWorkspaceUpdated);
    };
  }, [channel]);

  useEffect(() => {
    if (!channel) return;

    const handleNewMessage = (message: ConversationMessage) => {
      const messageWithStatus: MessageWithStatus = {
        ...message,
        sendStatus:
          message.sender.email === currentUser.email ? "sent" : undefined,
      };

      setLocalMessages((current) => [...current, messageWithStatus]);

      setMessages((current) => [...current, message]);

      if (message.sender.email !== currentUser.email) {
        markMessageAsSeen(message.id);
      }
    };

    const handleMessageUpdate = (message: ConversationMessage) => {
      const processedMessage = {
        ...message,
        body: message.isDeleted
          ? "This message has been deleted"
          : message.body,
        isEdited: message.isEdited || false,
        editedAt: message.editedAt || null,
        isDeleted: message.isDeleted || false,
        deletedAt: message.deletedAt || null,
      };

      setMessages((current) =>
        current.map((msg) => (msg.id === message.id ? processedMessage : msg))
      );

      setLocalMessages((current) =>
        current.map((msg) => {
          if (msg.id === message.id) {
            const status =
              message.sender.email === currentUser.email &&
              message.seenIds.length > 1
                ? "seen"
                : msg.sendStatus || "sent";

            return {
              ...processedMessage,
              sendStatus: status,
            };
          }
          return msg;
        })
      );
    };

    channel.bind("messages:new", handleNewMessage);
    channel.bind("messages:update", handleMessageUpdate);

    return () => {
      channel.unbind("messages:new", handleNewMessage);
      channel.unbind("messages:update", handleMessageUpdate);
    };
  }, [channel, currentUser.email, currentUser.id, setMessages, workspaceId]);

  useEffect(() => {
    if (isExpanded) {
      localMessages.forEach((message) => {
        if (
          message.sender.email !== currentUser.email &&
          !message.seenIds.includes(currentUser.id)
        ) {
          markMessageAsSeen(message.id);
        }
      });
    }
  }, [
    isExpanded,
    localMessages,
    currentUser.email,
    workspaceId,
    currentUser.id,
  ]);

  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [localMessages, isExpanded]);

  const allMembersSeen = (seenIds: string[]) => {
    if (!members) return false;
    return members.every((member) => seenIds.includes(member.user.id));
  };

  const isUserActive = (email: string) => {
    return activeMembers.includes(email);
  };

  const isMessageEditable = (message: MessageWithStatus) => {
    if (message.sender.email !== currentUser.email) return false;
    if (message.isDeleted) return false;

    const now = new Date();
    const messageTime = new Date(message.createdAt);
    const diffInMinutes = (now.getTime() - messageTime.getTime()) / (1000 * 60);

    return diffInMinutes <= 2;
  };

  const unreadCount = localMessages.filter(
    (message) =>
      message.sender.email !== currentUser?.email &&
      !message.seenIds.includes(currentUser?.id || "")
  ).length;

  if (isMessagesLoading || !workspaceId) {
  }

  return (
    <div
      className="fixed bottom-4 right-4 w-[380px] shadow-lg rounded-lg bg-white border border-gray-200"
      style={{ zIndex: 999 }}
    >
      {/* Header */}
      <div
        className={`bg-black text-white p-3 flex justify-between items-center cursor-pointer ${
          isExpanded ? "rounded-t-lg" : "rounded-lg"
        }`}
        onClick={toggleExpanded}
      >
        <div>
          <h3 className="font-semibold">{localWorkspaceInfo?.name || ""}</h3>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-300">{unreadCount} new messages</p>
          )}
        </div>

        <div className="flex items-center">
          <div className="flex -space-x-2 mr-3">
            {members?.slice(0, 4).map((member) => (
              <Avatar
                key={member.user.id}
                className="border-2 border-black w-8 h-8"
              >
                <AvatarImage
                  src={member.user.image || "/images/placeholder.svg"}
                  alt={member.user.name || ""}
                />
                <AvatarFallback>
                  {member.user.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
            ))}
            {members && members.length > 4 && (
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs border-2 border-black">
                +{members.length - 4}
              </div>
            )}
          </div>
          {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </div>
      </div>

      {/* Chat Content */}
      {isExpanded && (
        <>
          <div className="h-[400px] overflow-y-auto p-3 bg-white">
            {localMessages.map((message) => {
              const isCurrentUser = message.sender.email === currentUser.email;
              const sender = message.sender;
              const time = new Intl.DateTimeFormat("en-US", {
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              }).format(new Date(message.createdAt));

              const isSeenByAll = allMembersSeen(message.seenIds);
              const showStatusIndicator = isCurrentUser;
              const editable = isMessageEditable(message);

              return (
                <div key={message.id} className="mb-4">
                  {/* Sender Info */}
                  <div
                    className={cn(
                      "flex items-center mb-1",
                      isCurrentUser ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isCurrentUser && (
                      <>
                        {/* Avatar for other users */}
                        <div className="relative mr-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage
                              src={sender?.image || "/images/placeholder.svg"}
                            />
                            <AvatarFallback>
                              {sender?.name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          {isUserActive(sender?.email) && (
                            <span className="absolute top-0 right-0 block rounded-full bg-green-500 ring-2 ring-white h-2 w-2 -mt-0.5 mr-0.5" />
                          )}
                        </div>
                        {/* Name and time for other users */}
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-600">
                            {sender?.name}
                          </span>
                          <span className="text-xs text-gray-400">{time}</span>
                        </div>
                      </>
                    )}

                    {isCurrentUser && (
                      <>
                        {/* Name and time for current user */}
                        <div className="flex flex-col items-end mr-2">
                          <span className="text-sm text-gray-600">
                            {sender?.name}
                          </span>
                          <span className="text-xs text-gray-400">{time}</span>
                        </div>
                        {/* Avatar for current user */}
                        <div className="relative">
                          <Avatar className="w-8 h-8">
                            <AvatarImage
                              src={sender?.image || "/images/placeholder.svg"}
                            />
                            <AvatarFallback>
                              {sender?.name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          {isUserActive(sender?.email) && (
                            <span className="absolute top-0 right-0 block rounded-full bg-green-500 ring-2 ring-white h-2 w-2 -mt-0.5 mr-0.5" />
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Message Container */}
                  <div
                    className={cn(
                      "flex w-full",
                      isCurrentUser ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* For Current User's Messages - Edit/Delete icons on the left */}
                    {isCurrentUser && !message.isDeleted && (
                      <div className="self-center mr-2 flex space-x-1">
                        {editable && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-500 hover:text-blue-600"
                            onClick={() => startEditMessage(message)}
                          >
                            <Edit2 size={14} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-500 hover:text-red-600"
                          onClick={() => handleDeleteMessage(message.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={cn(
                        "rounded-lg p-3 inline-block",
                        isCurrentUser
                          ? "bg-black text-white"
                          : "bg-gray-100 text-black",
                        "max-w-[75%]",
                        "break-words"
                      )}
                    >
                      {editingMessageId === message.id ? (
                        <div className="flex flex-col">
                          <Input
                            ref={editInputRef}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="mb-2 bg-gray-200 text-black"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                saveEditedMessage();
                              }
                            }}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelEdit();
                              }}
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              type="button"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                saveEditedMessage();
                              }}
                              size="sm"
                              className="h-7 px-2 bg-blue-600"
                              type="button"
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {message.isDeleted ? (
                            <div className="flex items-center opacity-70">
                              <Ban size={16} className="mr-2" />
                              <span className="italic">
                                This message has been deleted
                              </span>
                            </div>
                          ) : (
                            <>
                              <span className="whitespace-pre-wrap">
                                {message.body}
                              </span>
                              {message.image && (
                                <div className="mt-2">
                                  <img
                                    src={message.image}
                                    alt="Shared Image"
                                    className="max-w-full rounded-md"
                                    onClick={() =>
                                      message.image &&
                                      window.open(message.image, "_blank")
                                    }
                                    style={{ cursor: "pointer" }}
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>

                    {/* Removed dropdown for other users */}
                  </div>

                  {/* Message Status Indicators */}
                  <div
                    className={cn(
                      "flex mt-1",
                      isCurrentUser ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* Edited indicator - show for all edited messages */}
                    {message.isEdited && !message.isDeleted && (
                      <span className="text-xs text-gray-400 mr-2">
                        (edited{" "}
                        {message.editedAt
                          ? format(new Date(message.editedAt), "p")
                          : ""}
                        )
                      </span>
                    )}

                    {/* Read/Delivery status - only for current user's non-deleted messages */}
                    {showStatusIndicator && !message.isDeleted && (
                      <>
                        {message.sendStatus === "seen" ? (
                          <span
                            className={cn(
                              "text-xs flex items-center",
                              isSeenByAll ? "text-green-500" : "text-gray-400"
                            )}
                          >
                            <CheckCheck className="mr-1" size={14} />
                            Seen
                          </span>
                        ) : message.sendStatus === "sending" ? (
                          <span className="text-xs flex items-center text-gray-400">
                            Sending...
                          </span>
                        ) : (
                          <span className="text-xs flex items-center text-gray-400">
                            <Check className="mr-1" size={14} />
                            Sent
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Image Preview */}
          {imageToSend && (
            <div className="p-2 bg-gray-50 border-t flex items-center">
              <div className="relative">
                <img
                  src={imageToSend}
                  alt="Image Preview"
                  className="h-16 w-16 object-cover rounded-md"
                />
                <button
                  onClick={cancelImageUpload}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X size={14} />
                </button>
              </div>
              <span className="ml-2 text-sm text-gray-600">
                Image ready to send
              </span>
            </div>
          )}

          {/* Input Area with fixed Enter key handling */}
          <div className="border-t p-3 bg-white rounded-b-lg">
            <form onSubmit={handleSendMessage} className="flex items-center">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Send a message to team!"
                className="flex-1 mr-2 focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <div className="flex items-center">
                <div onClick={(e) => e.stopPropagation()}>
                  <CldUploadButton
                    options={{ maxFiles: 1 }}
                    onSuccess={handleUpload}
                    uploadPreset="catatan_cerdas_chat"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-gray-500"
                    >
                      <ImageIcon size={20} />
                    </Button>
                  </CldUploadButton>
                </div>
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full bg-black ml-2"
                >
                  <Send size={18} />
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export default function ChatWidget(props: ChatWidgetProps) {
  return (
    <PusherChannelProvider channelName={`workspace-${props.workspaceId}`}>
      <ChatWidgetContent {...props} />
    </PusherChannelProvider>
  );
}
