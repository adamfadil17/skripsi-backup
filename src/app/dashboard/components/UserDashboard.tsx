'use client';

import WorkspaceOrganizer from './WorkspaceOrganizer';
import Banner from './Banner';
import { Skeleton } from '@/components/ui/skeleton';
import { User } from '@prisma/client';
import { useWorkspace } from '@/app/context/WorkspaceContext';

interface UserDashboardProps {
  currentUser: User;
}

const UserDashboard = ({ currentUser }: UserDashboardProps) => {
  const { workspaces, loading } = useWorkspace();

  const isSuperAdmin = workspaces.some((workspace) =>
    workspace.members.some(
      (member) =>
        member.userId === currentUser?.id && member.role === 'SUPER_ADMIN'
    )
  );

  return (
    <div className="flex flex-col w-full gap-8 my-4 min-h-screen">
      <div className="w-full mx-auto px-6 md:px-24">
        <Banner currentUser={currentUser} />
      </div>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <WorkspaceOrganizer
          workspaces={workspaces}
          isSuperAdmin={isSuperAdmin}
          viewMode="grid"
        />
      )}
    </div>
  );
};

const LoadingSkeleton = () => {
  return (
    <div className="space-y-6 px-6 md:px-24">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="border rounded-lg shadow p-4">
              <Skeleton className="h-36 w-full rounded-t mb-4" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
      </div>
    </div>
  );
};

export default UserDashboard;
