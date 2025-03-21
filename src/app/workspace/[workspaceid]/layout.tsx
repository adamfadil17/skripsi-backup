import { getCurrentUser } from '@/app/actions/getCurrentUser';
import SidebarNav from './components/SidebarNav';
import TopbarWorkspace from './components/TopbarWorkspace';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ReactNode } from 'react';
import { getWorkspaceInfo } from '@/app/actions/getWorkspaceInfo';
import { notFound } from 'next/navigation';

interface WorkspaceLayoutProps {
  children: ReactNode;
  params: { workspaceid: string };
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const currentUser = await getCurrentUser();
  const workspaceId = params?.workspaceid;

  const workspaceInfo = await getWorkspaceInfo(workspaceId);

  if (!workspaceInfo) {
    notFound();
  }

  const currentMember = workspaceInfo.members.find(
    (member) => member.user.id === currentUser?.id
  );

  const isSuperAdmin = currentMember?.role === 'SUPER_ADMIN';
  const isAdmin = currentMember?.role === 'ADMIN';

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <SidebarNav
          workspaceId={workspaceId}
          workspaceInfo={workspaceInfo}
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
          currentUser={currentUser!}
        />
        <div className="flex flex-col flex-1">
          <TopbarWorkspace currentUser={currentUser!} />
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
