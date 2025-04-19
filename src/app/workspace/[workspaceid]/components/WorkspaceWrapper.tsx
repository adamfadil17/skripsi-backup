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
import { ChevronDown, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PusherChannelProvider } from './PusherChannelProvider';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserWorkspace } from '@/types/types';
import NotificationWrapper from './NotificationWrapper';
import ChatWidget from './ChatWidget';
import { useIsMobile } from '@/hooks/use-mobile';

interface WorkspaceWrapperProps {
  workspaceId: string;
  currentUser: User;
  workspaces: UserWorkspace[];
  children: React.ReactNode;
}

export default function WorkspaceWrapper({
  workspaceId,
  currentUser,
  workspaces,
  children,
}: WorkspaceWrapperProps) {
  const route = useRouter();
  const isMobile = useIsMobile()

  const {
    isLoading,
    workspaceInfo,
    members,
    documents,
    invitations,
    isSuperAdmin,
    isAdmin,
  } = useWorkspaceData(workspaceId, currentUser);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    route.push('/');
  };

  if (isLoading) return <LoadingScreen />;
  if (!workspaceInfo) return notFound();

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
              <NotificationWrapper
                workspaceId={workspaceId}
                currentUser={currentUser}
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
      <ChatWidget />
    </SidebarProvider>
  );
}
