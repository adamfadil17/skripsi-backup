import React from 'react';
import { getCurrentUser } from '../actions/getCurrentUser';
import { WorkspaceOrganizer } from '@/components/shared/WorkspaceOrganizer';
import { dummyWorkspaces } from '@/lib/workspacedata';
import { Banner } from '@/components/shared/Banner';

const IS_ADMIN = true;
const Dashboard = async () => {
  const currentUser = await getCurrentUser();

  return (
    <div className="flex flex-col w-full gap-8 my-4 min-h-screen">
      <div className="w-full mx-auto px-6 md:px-24">
        <Banner currentUser={currentUser!} />
      </div>
      <WorkspaceOrganizer
        workspaces={dummyWorkspaces}
        isAdmin={IS_ADMIN}
        viewMode="grid"
      />
    </div>
  );
};

export default Dashboard;
