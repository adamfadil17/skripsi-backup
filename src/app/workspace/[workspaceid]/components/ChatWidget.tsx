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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMessages } from '@/hooks/use-messages';
import { useActiveList } from '@/hooks/use-active-list';
import type { WorkspaceMember, WorkspaceInfo } from '@/types/types';
import { PusherChannelProvider } from './PusherChannelProvider';

interface ChatWidgetProps {
  workspaceId: string;
  currentUser: User;
  workspaceInfo?: WorkspaceInfo;
  members?: WorkspaceMember[];
}

export default function ChatWidget({
  workspaceId,
  currentUser,
  workspaceInfo,
  members,
}: ChatWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { activeMembers } = useActiveList();

  // Get messages
  const {
    messages,
    isLoading: isMessagesLoading,
    sendMessage,
  } = useMessages(workspaceId);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !workspaceId) return;

    sendMessage(input);
    setInput('');
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Function to check if all members have seen the message
  const allMembersSeen = (seenIds: string[]) => {
    if (!members) return false;
    // Use email as the identifier since that's what we're using in Pusher
    return members.every((member) => seenIds.includes(member.user.email));
  };

  // Count unread messages
  const unreadCount = messages.filter(
    (message) =>
      message.sender.email !== currentUser?.email &&
      !message.seenIds.includes(currentUser?.email || '')
  ).length;

  if (isMessagesLoading || !workspaceId) {
    return null; // Don't render until everything is loaded
  }

  return (
    <PusherChannelProvider channelName={`workspace-${workspaceId}-chat`}>
      <div className="fixed bottom-4 right-4 w-[380px] shadow-lg rounded-lg overflow-hidden bg-white border border-gray-200">
        {/* Header */}
        <div
          className="bg-black text-white p-3 flex justify-between items-center cursor-pointer"
          onClick={toggleExpanded}
        >
          <div>
            <h3 className="font-semibold">
              {workspaceInfo?.name || 'Workspace Chat'}
            </h3>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-300">
                {unreadCount} new messages
              </p>
            )}
          </div>

          <div className="flex items-center">
            <div className="flex -space-x-2 mr-3">
              {members?.slice(0, 4).map((member) => (
                <Avatar
                  key={member.user.id}
                  className={cn(
                    'border-2 border-black w-8 h-8',
                    activeMembers.includes(member.user.email) &&
                      'ring-2 ring-green-500'
                  )}
                >
                  <AvatarImage
                    src={member.user.image || '/placeholder.svg'}
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
              {messages.map((message) => {
                const isCurrentUser =
                  message.sender.email === currentUser.email;
                const sender = message.sender;
                const time = new Intl.DateTimeFormat('en-US', {
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: true,
                }).format(new Date(message.createdAt));

                // Determine if all members have seen the message
                const isSeenByAll = allMembersSeen(message.seenIds);
                // Only show seen indicator for current user's messages and if seen by at least one other person
                const showSeenIndicator =
                  isCurrentUser && message.seenIds.length > 1;

                return (
                  <div key={message.id} className="mb-4">
                    <div
                      className={cn(
                        'flex items-center mb-1',
                        isCurrentUser ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <Avatar className="w-8 h-8 mr-2">
                        <AvatarImage
                          src={sender?.image || '/placeholder.svg'}
                        />
                        <AvatarFallback>
                          {sender?.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-600">
                        {sender?.name}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">{time}</span>
                    </div>

                    <div
                      className={cn(
                        'flex',
                        isCurrentUser ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[70%] rounded-lg p-3',
                          isCurrentUser
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-black'
                        )}
                      >
                        {message.body}
                      </div>
                    </div>

                    {/* Only show seen indicator for current user's messages */}
                    {showSeenIndicator && (
                      <div className="flex justify-end mt-1">
                        <span
                          className={cn(
                            'text-xs flex items-center',
                            isSeenByAll ? 'text-green-500' : 'text-gray-400'
                          )}
                        >
                          <CheckCheck className="mr-1" size={14} />
                          Seen
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t p-3 bg-white">
              <form onSubmit={handleSendMessage} className="flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-gray-500"
                >
                  <ImageIcon size={20} />
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Send a message to team!"
                  className="flex-1 mx-2 focus-visible:ring-0"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full bg-black"
                >
                  <Send size={18} />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </PusherChannelProvider>
  );
}
