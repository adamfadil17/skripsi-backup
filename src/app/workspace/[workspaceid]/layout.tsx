import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { SidebarProvider } from '@/components/ui/sidebar';
import { PusherChannelProvider } from './components/PusherChannelProvider';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prismadb';
import TopbarWorkspace from './components/TopbarWorkspace';
import WorkspaceSidebar from './components/WorkspaceSidebar';

interface WorkspaceLayoutProps {
  children: ReactNode;
  params: { workspaceid: string };
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return notFound();
  }

  const workspaceId = params?.workspaceid;

  const currentMember = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: currentUser.id,
        workspaceId,
      },
    },
  });

  if (!currentMember) {
    return notFound();
  }

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen overflow-hidden">
        <PusherChannelProvider channelName={`workspace-${workspaceId}`}>
          <WorkspaceSidebar
            workspaceId={workspaceId}
            currentUser={currentUser}
          />
        </PusherChannelProvider>
        <div className="flex flex-col flex-1 min-w-0">
          <PusherChannelProvider channelName={`notification-${workspaceId}`}>
            <TopbarWorkspace
              currentUser={currentUser}
              workspaceId={workspaceId}
            />
          </PusherChannelProvider>
          <PusherChannelProvider channelName={`workspace-${workspaceId}`}>
            <main className="flex-1 p-6 overflow-auto">{children}</main>
          </PusherChannelProvider>
        </div>
      </div>
    </SidebarProvider>
  );
}
