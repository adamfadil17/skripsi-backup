import { User } from '@prisma/client';
import NotificationSystem from '../NotificationSystem';
import { useNotifications } from '@/hooks/use-notifications';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NotificationWrapperProps {
  workspaceId: string;
  currentUser: User;
}

const NotificationWrapper = ({
  workspaceId,
  currentUser,
}: NotificationWrapperProps) => {
  const { notifications, markAllAsRead } = useNotifications(workspaceId);
  const [unreadCount, setUnreadCount] = useState(0);

  // Update unread count whenever notifications change
  useEffect(() => {
    const count = notifications.filter(
      (notification) => !notification.read
    ).length;
    setUnreadCount(count);
  }, [notifications]);

  
  // Handler for when notifications are marked as read
  const handleNotificationsRead = () => {
    setUnreadCount(0);
  };

  const notificationTrigger = (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
  return (
    <NotificationSystem
      workspaceId={workspaceId}
      trigger={notificationTrigger}
      onMarkAllAsRead={handleNotificationsRead}
    />
  );
};

export default NotificationWrapper;
