// NotificationSystem.tsx
'use client';

import type React from 'react';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  type NotificationType,
  type Notification,
  isWorkspaceFilterNotification,
  isDocumentFilterNotification,
} from '@/lib/notification';

interface NotificationSystemProps {
  trigger?: React.ReactNode;
  notifications: Notification[];
  onMarkAllAsRead: () => void;
}

const NotificationSystem = ({
  trigger,
  notifications,
  onMarkAllAsRead,
}: NotificationSystemProps) => {
  const [filter, setFilter] = useState<NotificationType | 'all'>('all');
  const [isOpen, setIsOpen] = useState(false);

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'all') return true;
    if (filter === 'workspace')
      return isWorkspaceFilterNotification(notification);
    if (filter === 'document')
      return isDocumentFilterNotification(notification);
    return notification.type === filter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasUnread = unreadCount > 0;

  const getNotificationMessage = (notification: Notification): string => {
    // Just use the message property directly, as it's already formatted in useNotifications
    return notification.message;
  };

  const defaultTrigger = (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {hasUnread && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-medium text-white flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Button>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{trigger || defaultTrigger}</PopoverTrigger>
      <PopoverContent
        className="w-[420px] p-0"
        align="end"
        side="bottom"
        sideOffset={24}
      >
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h4 className="text-sm font-semibold">Notifications</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className={
              !hasUnread
                ? 'text-muted-foreground hover:text-muted-foreground'
                : ''
            }
            disabled={!hasUnread}
          >
            Mark all as read
          </Button>
        </div>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid grid-cols-3 w-full rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              value="all"
              className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary"
              onClick={() => setFilter('all')}
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="workspace"
              className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary"
              onClick={() => setFilter('workspace')}
            >
              Workspace
            </TabsTrigger>
            <TabsTrigger
              value="document"
              className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary"
              onClick={() => setFilter('document')}
            >
              Document
            </TabsTrigger>
          </TabsList>
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 ${
                      !notification.read ? 'bg-muted/50' : ''
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={
                          notification.user.avatar || '/images/placeholder.svg'
                        }
                        alt={notification.user.name}
                      />
                      <AvatarFallback>
                        {notification.user.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {getNotificationMessage(notification)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.timestamp}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center p-6">
                  <p className="text-sm text-muted-foreground">
                    No notifications
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationSystem;
