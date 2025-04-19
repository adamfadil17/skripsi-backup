'use client';

import type { User } from '@prisma/client';
import NotificationSystem from './NotificationSystem';
import { useNotifications } from '@/hooks/use-notifications';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

interface NotificationWrapperProps {
  workspaceId: string;
  currentUser: User;
}

const NotificationWrapper = ({
  workspaceId,
  currentUser,
}: NotificationWrapperProps) => {
  const { notifications, markAllAsRead } = useNotifications(workspaceId);
  // Gunakan state terpisah untuk melacak notifikasi yang belum dibaca
  const [unreadCount, setUnreadCount] = useState(0);

  // Reset semua notifikasi yang ditandai telah dibaca
  const handleMarkAllAsRead = async () => {
    // Panggil fungsi markAllAsRead dari hook
    await markAllAsRead();
    // Segera perbarui unreadCount menjadi 0 untuk respons UI yang cepat
    setUnreadCount(0);
  };

  // Update unread count when notifications change
  useEffect(() => {
    console.log('Notifikasi terbarui:', notifications);
    // Calculate the current unread count directly from the notifications array
    const count = notifications.filter(
      (notification) => !notification.read
    ).length;
    console.log('Jumlah unread baru:', count);
    setUnreadCount(count);
  }, [notifications]);

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
      workspaceId={workspaceId}
      trigger={notificationTrigger}
      onMarkAllAsRead={handleMarkAllAsRead}
    />
  );
};

export default NotificationWrapper;
