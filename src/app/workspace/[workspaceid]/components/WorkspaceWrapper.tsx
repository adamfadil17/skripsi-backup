'use client';

import { notFound } from 'next/navigation';
import type { User } from '@prisma/client';
import { useWorkspaceData } from '@/hooks/use-workspace-data';
import LoadingScreen from './LoadingScreen';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Bell, ChevronDown, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PusherChannelProvider } from './PusherChannelProvider';
import { useNotifications } from '@/hooks/use-notifications';
import { useEffect, useState } from 'react';
import NotificationSystem from './NotificationSystem';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserWorkspace } from '@/types/types';

interface WorkspaceWrapperProps {
  workspaceId: string;
  currentUser: User;
  workspaces: UserWorkspace[]
  children: React.ReactNode;
}

export default function WorkspaceWrapper({
  workspaceId,
  currentUser,
  workspaces,
  children,
}: WorkspaceWrapperProps) {
  const route = useRouter();

  const {
    isLoading,
    workspaceInfo,
    members,
    documents,
    invitations,
    isSuperAdmin,
    isAdmin,
  } = useWorkspaceData(workspaceId, currentUser);

  const { notifications, markAllAsRead } = useNotifications(workspaceId);
  const [unreadCount, setUnreadCount] = useState(0);

  // Update unread count whenever notifications change
  useEffect(() => {
    const count = notifications.filter(
      (notification) => !notification.read
    ).length;
    setUnreadCount(count);
  }, [notifications]);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    route.push('/');
  };
  // Handler for when notifications are marked as read
  const handleNotificationsRead = () => {
    setUnreadCount(0);
  };

  if (isLoading) return <LoadingScreen />;
  if (!workspaceInfo) return notFound();

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
    <SidebarProvider className="flex h-screen w-full overflow-hidden">
      <PusherChannelProvider channelName={`workspace-${workspaceId}`}>
        <AppSidebar
          workspaceId={workspaceId}
          currentUser={currentUser}
          workspaces={workspaces}
          initialWorkspaceInfo={workspaceInfo}
          initialMembers={members}
          initialDocuments={documents}
          initialInvitations={invitations}
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
        />
      </PusherChannelProvider>
      <SidebarInset>
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <PusherChannelProvider channelName={`notification-${workspaceId}`}>
              <NotificationSystem
                workspaceId={workspaceId}
                trigger={notificationTrigger}
                onMarkAllAsRead={handleNotificationsRead}
              />
            </PusherChannelProvider>

            {/* Profile Container */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={currentUser.image || '/placeholder.svg'}
                    alt={currentUser.name}
                  />
                  <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="hidden flex-col items-start md:flex">
                  <span className="text-sm font-medium">
                    {currentUser.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {currentUser.email}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content - Document Editor */}
        <PusherChannelProvider channelName={`workspace-${workspaceId}`}>
          <main className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {/* Document Editor */}
            {children}
          </main>
        </PusherChannelProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
