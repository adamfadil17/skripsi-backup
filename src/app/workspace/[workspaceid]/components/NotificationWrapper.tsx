// NotificationWrapper.tsx
'use client';

import type { User } from '@prisma/client';
import NotificationSystem from './NotificationSystem';
import { useNotifications } from '@/hooks/use-notifications';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotificationWrapperProps {
  workspaceId: string;
  currentUser: User;
}

const NotificationWrapper = ({
  workspaceId,
  currentUser,
}: NotificationWrapperProps) => {
  const { notifications, markAllAsRead } = useNotifications(workspaceId);

  // Handle marking all notifications as read
  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const notificationTrigger = (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-medium text-white flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Button>
  );

  return (
    <NotificationSystem
      notifications={notifications}
      trigger={notificationTrigger}
      onMarkAllAsRead={handleMarkAllAsRead}
    />
  );
};

export default NotificationWrapper;
