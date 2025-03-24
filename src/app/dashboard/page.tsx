import React from 'react';
import { getCurrentUser } from '../actions/getCurrentUser';
import WorkspaceOrganizer from './components/WorkspaceOrganizer';
import { getUserWorkspaces } from '../actions/getUserWorkspaces';
import Banner from './components/Banner';
import { UserWorkspace } from '@/types/types';

const Dashboard = async () => {
  const currentUser = await getCurrentUser();
  const workspaces: UserWorkspace[] = await getUserWorkspaces(currentUser!);

  const isSuperAdmin = workspaces.some((workspace) =>
    workspace.members.some(
      (member) =>
        member.userId === currentUser?.id && member.role === 'SUPER_ADMIN'
    )
  );

  return (
    <div className="flex flex-col w-full gap-8 my-4 min-h-screen">
      <div className="w-full mx-auto px-6 md:px-24">
        <Banner currentUser={currentUser!} />
      </div>
      <WorkspaceOrganizer
        workspaces={workspaces}
        isSuperAdmin={isSuperAdmin}
        viewMode="grid"
      />
    </div>
  );
};

export default Dashboard;
