'use client';
import type { User } from '@prisma/client';
import { useState, useEffect } from 'react';
import Avatar from '@/components/shared/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import SignOutButton from '@/components/shared/SignOutButton';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Menu } from 'lucide-react';
import NotificationSystem from './NotificationSystem';
import { useNotifications } from '@/hooks/use-notifications';
import { FiBell } from 'react-icons/fi';

interface TopbarWorkspaceProps {
  currentUser: User;
  workspaceId: string;
}

const TopbarWorkspace = ({
  currentUser,
  workspaceId,
}: TopbarWorkspaceProps) => {
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

  // Custom trigger with bell icon from react-icons and badge for notification count
  const notificationTrigger = (
    <div className="relative cursor-pointer p-2 rounded-md hover:bg-gray-100">
      <FiBell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </div>
  );

  return (
    <div className="sticky top-0 z-10 flex w-full h-[70px] items-center justify-between bg-white px-4 md:px-6 shadow-md">
      <SidebarTrigger className="md:hidden">
        <Menu className="h-5 w-5" />
      </SidebarTrigger>

      <div className="flex-1" />

      <div className="flex items-center gap-6">
        <NotificationSystem
          workspaceId={workspaceId}
          trigger={notificationTrigger}
          onMarkAllAsRead={handleNotificationsRead}
        />

        <DropdownMenu>
          <DropdownMenuTrigger
            asChild
            className="px-2 py-1 cursor-pointer rounded-md hover:bg-gray-100"
          >
            <Avatar currentUser={currentUser} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="mt-3 w-56">
            <SignOutButton />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default TopbarWorkspace;
