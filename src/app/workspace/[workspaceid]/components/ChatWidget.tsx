'use client';

import type React from 'react';
import type { User } from '@prisma/client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMessages } from '@/hooks/use-messages';
import type {
  WorkspaceMember,
  WorkspaceInfo,
  ConversationMessage,
} from '@/types/types';
import {
  PusherChannelProvider,
  usePusherChannelContext,
} from './PusherChannelProvider';
import useActiveList from '@/hooks/use-active-list';
import { CldUploadButton } from 'next-cloudinary';
import { format } from 'date-fns';

interface ChatWidgetProps {
  workspaceId: string;
  currentUser: User;
  workspaceInfo?: WorkspaceInfo;
  members?: WorkspaceMember[];
}

// Updated interface for message with status
interface MessageWithStatus extends ConversationMessage {
  sendStatus?: 'sending' | 'sent' | 'seen';
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
  const [input, setInput] = useState('');
  const [imageToSend, setImageToSend] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const { members: activeMembers } = useActiveList();
  const { channel } = usePusherChannelContext();

  // Use MessageWithStatus for messages state
  const [localMessages, setLocalMessages] = useState<MessageWithStatus[]>([]);

  // Get messages
  const {
    messages,
    setMessages,
    isLoading: isMessagesLoading,
    sendMessage,
    editMessage,
    deleteMessage,
  } = useMessages(workspaceId);

  // Sync server messages with local messages
  useEffect(() => {
    if (messages.length > 0) {
      // Map messages to properly handle isDeleted/isEdited states
      const updatedMessages = messages.map((message) => {
        // Set status based on whether message is seen by others
        let status: 'sending' | 'sent' | 'seen' = 'sent';

        // If message is from current user and seen by others
        if (
          message.sender.email === currentUser.email &&
          message.seenIds.length > 1
        ) {
          status = 'seen';
        }

        return {
          ...message,
          // Make sure deleted messages always show the placeholder text
          body: message.isDeleted
            ? 'This message has been deleted'
            : message.body,
          // Ensure all status properties are correctly preserved
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

    // Create optimistic message
    const optimisticMessage: MessageWithStatus = {
      id: Date.now().toString(), // temporary id
      body: input,
      image: imageToSend || null,
      conversationId: '',
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
        name: currentUser.name || '',
        email: currentUser.email || '',
        image: currentUser.image || null,
      },
      sendStatus: 'sending', // Initial status is 'sending'
      isEdited: false,
      isDeleted: false,
    };

    // Add optimistic message to local state
    setLocalMessages((prev) => [...prev, optimisticMessage]);

    // Send message to server
    try {
      const sentMessage = await sendMessage(input, imageToSend);

      // Update the optimistic message status to 'sent' once server response is received
      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticMessage.id
            ? { ...msg, id: sentMessage?.id || msg.id, sendStatus: 'sent' }
            : msg
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      // Handle error here if needed
    }

    setInput('');
    setImageToSend(null);
  };

  // Start editing a message
  const startEditMessage = (message: MessageWithStatus) => {
    // Check if the message is within the 2-minute edit window
    const now = new Date();
    const messageTime = new Date(message.createdAt);
    const diffInMinutes = (now.getTime() - messageTime.getTime()) / (1000 * 60);

    if (diffInMinutes > 2) {
      alert('Edit time window expired (2 minutes)');
      return;
    }

    setEditingMessageId(message.id);
    setEditText(message.body || '');

    // Focus the edit input after it's rendered
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
      }
    }, 0);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  // Save edited message
  const saveEditedMessage = async () => {
    if (!editingMessageId || !editText.trim()) return;

    const now = new Date();

    // Optimistically update the message in the UI
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
      // Send the edit to the server
      await editMessage(editingMessageId, editText);
    } catch (error) {
      console.error('Failed to edit message:', error);
      // Revert optimistic update on error
      alert('Failed to edit message');

      // Revert changes if it fails
      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg.id === editingMessageId
            ? {
                ...msg,
                body: msg.body, // Restore original body
                isEdited: false,
                editedAt: null,
              }
            : msg
        )
      );
    }

    setEditingMessageId(null);
    setEditText('');
  };

  // Handle delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!messageId) return;

    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }

    // Optimistically update UI
    setLocalMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              body: 'This message has been deleted',
              isDeleted: true,
              deletedAt: new Date(),
            }
          : msg
      )
    );

    try {
      // Send deletion request to server
      await deleteMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message');

      // Restore status if server request fails
      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                body: msg.body, // Restore original body
                isDeleted: false,
                deletedAt: null,
              }
            : msg
        )
      );
    }
  };

  // Handle image upload
  const handleUpload = (result: any, options: any) => {
    if (result?.info?.secure_url) {
      setImageToSend(result.info.secure_url);
    }
  };

  // Cancel image upload
  const cancelImageUpload = () => {
    setImageToSend(null);
  };

  // Mark a message as seen
  const markMessageAsSeen = async (messageId: string) => {
    try {
      await fetch(`/api/workspace/${workspaceId}/conversation/seen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId }),
      });
    } catch (error) {
      console.error('Error marking message as seen:', error);
    }
  };

  // Set up Pusher event listeners
  useEffect(() => {
    if (!channel) return;

    // Listen for new messages
    const handleNewMessage = (message: ConversationMessage) => {
      // Add the new message to the messages state with status
      const messageWithStatus: MessageWithStatus = {
        ...message,
        sendStatus:
          message.sender.email === currentUser.email ? 'sent' : undefined,
      };

      setLocalMessages((current) => [...current, messageWithStatus]);

      // Add to server messages state as well
      setMessages((current) => [...current, message]);

      // If the message is from someone else, mark it as seen
      if (message.sender.email !== currentUser.email) {
        markMessageAsSeen(message.id);
      }
    };

    // Listen for message updates (seen status, edits, and deletions)
    const handleMessageUpdate = (message: ConversationMessage) => {
      // Process the message to ensure deleted and edited messages display correctly
      const processedMessage = {
        ...message,
        // Always replace deleted message body with placeholder
        body: message.isDeleted
          ? 'This message has been deleted'
          : message.body,
        // Ensure edited information is preserved
        isEdited: message.isEdited || false,
        editedAt: message.editedAt || null,
        // Ensure deleted information is preserved
        isDeleted: message.isDeleted || false,
        deletedAt: message.deletedAt || null,
      };

      // Update server message state
      setMessages((current) =>
        current.map((msg) => (msg.id === message.id ? processedMessage : msg))
      );

      // Update local messages with status
      setLocalMessages((current) =>
        current.map((msg) => {
          if (msg.id === message.id) {
            // Update the status to 'seen' if the message is seen by others
            const status =
              message.sender.email === currentUser.email &&
              message.seenIds.length > 1
                ? 'seen'
                : msg.sendStatus || 'sent';

            return {
              ...processedMessage,
              sendStatus: status,
            };
          }
          return msg;
        })
      );
    };

    // Subscribe to events
    channel.bind('messages:new', handleNewMessage);
    channel.bind('messages:update', handleMessageUpdate);

    // Cleanup on unmount
    return () => {
      channel.unbind('messages:new', handleNewMessage);
      channel.unbind('messages:update', handleMessageUpdate);
    };
  }, [channel, currentUser.email, currentUser.id, setMessages, workspaceId]);

  // Mark visible messages as seen when expanded
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

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages, isExpanded]);

  // Function to check if all members have seen the message
  const allMembersSeen = (seenIds: string[]) => {
    if (!members) return false;
    // Use email as the identifier since that's what we're using in Pusher
    return members.every((member) => seenIds.includes(member.user.id));
  };

  const isUserActive = (email: string) => {
    return activeMembers.includes(email);
  };

  // Check if message is editable (within 2 minute window)
  const isMessageEditable = (message: MessageWithStatus) => {
    if (message.sender.email !== currentUser.email) return false;
    if (message.isDeleted) return false;

    const now = new Date();
    const messageTime = new Date(message.createdAt);
    const diffInMinutes = (now.getTime() - messageTime.getTime()) / (1000 * 60);

    return diffInMinutes <= 2;
  };

  // Count unread messages
  const unreadCount = localMessages.filter(
    (message) =>
      message.sender.email !== currentUser?.email &&
      !message.seenIds.includes(currentUser?.id || '')
  ).length;

  if (isMessagesLoading || !workspaceId) {
    return null; // Don't render until everything is loaded
  }

  return (
    <div
      className="fixed bottom-4 right-4 w-[380px] shadow-lg rounded-lg bg-white border border-gray-200"
      style={{ zIndex: 999 }}
    >
      {/* Header */}
      <div
        className={`bg-black text-white p-3 flex justify-between items-center cursor-pointer ${
          isExpanded ? 'rounded-t-lg' : 'rounded-lg'
        }`}
        onClick={toggleExpanded}
      >
        <div>
          <h3 className="font-semibold">
            {workspaceInfo?.name || 'Workspace Chat'}
          </h3>
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
                  src={member.user.image || '/images/placeholder.svg'}
                  alt={member.user.name || ''}
                />
                <AvatarFallback>
                  {member.user.name?.charAt(0) || '?'}
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
              const time = new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
              }).format(new Date(message.createdAt));

              // Determine if all members have seen the message
              const isSeenByAll = allMembersSeen(message.seenIds);
              // Show status indicator for current user's messages
              const showStatusIndicator = isCurrentUser;
              // Check if the message is editable (within 2 minutes and by the current user)
              const editable = isMessageEditable(message);

              return (
                <div key={message.id} className="mb-4">
                  {/* Sender Info */}
                  <div
                    className={cn(
                      'flex items-center mb-1',
                      isCurrentUser ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {!isCurrentUser && (
                      <>
                        {/* Avatar for other users */}
                        <div className="relative mr-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage
                              src={sender?.image || '/images/placeholder.svg'}
                            />
                            <AvatarFallback>
                              {sender?.name?.charAt(0) || '?'}
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
                              src={sender?.image || '/images/placeholder.svg'}
                            />
                            <AvatarFallback>
                              {sender?.name?.charAt(0) || '?'}
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
                      'flex w-full',
                      isCurrentUser ? 'justify-end' : 'justify-start'
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
                        'rounded-lg p-3 inline-block',
                        isCurrentUser
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-black',
                        'max-w-[75%]',
                        'break-words'
                      )}
                    >
                      {editingMessageId === message.id ? (
                        // Edit mode
                        <div className="flex flex-col">
                          <Input
                            ref={editInputRef}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="mb-2 bg-gray-200 text-black"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
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
                        // Message content
                        <>
                          {message.isDeleted ? (
                            // Deleted message with Ban icon
                            <div className="flex items-center opacity-70">
                              <Ban size={16} className="mr-2" />
                              <span className="italic">
                                This message has been deleted
                              </span>
                            </div>
                          ) : (
                            // Regular message content
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
                                      window.open(message.image, '_blank')
                                    }
                                    style={{ cursor: 'pointer' }}
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
                      'flex mt-1',
                      isCurrentUser ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {/* Edited indicator - show for all edited messages */}
                    {message.isEdited && !message.isDeleted && (
                      <span className="text-xs text-gray-400 mr-2">
                        (edited{' '}
                        {message.editedAt
                          ? format(new Date(message.editedAt), 'p')
                          : ''}
                        )
                      </span>
                    )}

                    {/* Read/Delivery status - only for current user's non-deleted messages */}
                    {showStatusIndicator && !message.isDeleted && (
                      <>
                        {message.sendStatus === 'seen' ? (
                          <span
                            className={cn(
                              'text-xs flex items-center',
                              isSeenByAll ? 'text-green-500' : 'text-gray-400'
                            )}
                          >
                            <CheckCheck className="mr-1" size={14} />
                            Seen
                          </span>
                        ) : message.sendStatus === 'sending' ? (
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
                  if (e.key === 'Enter' && !e.shiftKey) {
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
                    uploadPreset="catatan_cerdas"
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
