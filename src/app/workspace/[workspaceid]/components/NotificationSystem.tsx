'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  isWorkspaceNotification,
  isWorkspaceInvitationNotification,
  isDocumentNotification,
} from '@/lib/notification';
import {
  formatWorkspaceActivity,
  formatDocumentActivity,
} from '@/lib/notification-formatter';

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'workspace',
    activityType: 'workspace_update',
    user: {
      name: 'John Doe',
      avatar: '/placeholder.svg?height=32&width=32',
    },
    timestamp: '2h ago',
    read: false,
  },
  {
    id: '2',
    type: 'workspace',
    activityType: 'invitation',
    user: {
      name: 'Emily Chan',
      avatar: '/placeholder.svg?height=32&width=32',
    },
    invitedEmail: 'adam.fadilah17@gmail.com',
    timestamp: '3h ago',
    read: false,
  },
  {
    id: '3',
    type: 'document',
    activityType: 'content_update',
    user: {
      name: 'Alex Turner',
      avatar: '/placeholder.svg?height=32&width=32',
    },
    documentName: 'Q2 Report',
    timestamp: '5h ago',
    read: true,
  },
];

interface NotificationSystemProps {
  trigger?: React.ReactNode;
}

const NotificationSystem = ({ trigger }: NotificationSystemProps) => {
  const [notifications, setNotifications] =
    useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<NotificationType | 'all'>('all');

  const filteredNotifications = notifications.filter((notification) =>
    filter === 'all' ? true : notification.type === filter
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const getNotificationMessage = (notification: Notification): string => {
    if (isWorkspaceNotification(notification)) {
      if (isWorkspaceInvitationNotification(notification)) {
        return `${notification.user.name} invited ${notification.invitedEmail}`;
      }
      return formatWorkspaceActivity(
        notification.activityType,
        notification.user.name
      );
    } else if (isDocumentNotification(notification)) {
      return `${notification.user.name} updated "${notification.documentName}"`;
    }
    throw new Error('Unknown notification type');
  };

  const defaultTrigger = (
    <Button variant="outline" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </Button>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger || defaultTrigger}</PopoverTrigger>
      <PopoverContent
        className="w-[420px] p-0"
        align="start"
        side="right"
        sideOffset={24}
      >
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h4 className="text-sm font-semibold">Notifications</h4>
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        </div>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
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
          <ScrollArea className="h-[300px]">
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 ${
                    !notification.read ? 'bg-muted/50' : ''
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={notification.user.avatar}
                      alt={notification.user.name}
                    />
                    <AvatarFallback>{notification.user.name[0]}</AvatarFallback>
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
              ))}
            </div>
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationSystem;
