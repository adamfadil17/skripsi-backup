import { getCurrentUser } from '@/app/actions/getCurrentUser';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prismadb';
import WorkspaceWrapper from './components/WorkspaceWrapper';
import { getUserWorkspaces } from '@/app/actions/getUserWorkspaces';
import { UserWorkspace } from '@/types/types';

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

  const workspaces: UserWorkspace[] = await getUserWorkspaces(currentUser!);

  return (
    <WorkspaceWrapper
      currentUser={currentUser}
      workspaceId={workspaceId}
      workspaces={workspaces}
      children={children}
    />
  );
}
