import { getCurrentUser } from '@/app/actions/getCurrentUser';
import SidebarNav from './components/SidebarNav';
import TopbarWorkspace from './components/TopbarWorkspace';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ReactNode } from 'react';
import { getWorkspaceInfo } from '@/app/actions/getWorkspaceInfo';

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
    throw new Error('Workspace not found');
  }

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <SidebarNav workspaceId={workspaceId} workspaceInfo={workspaceInfo} />
        <div className="flex flex-col flex-1">
          <TopbarWorkspace currentUser={currentUser!} />
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
