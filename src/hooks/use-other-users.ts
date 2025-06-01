'use client';

import { useMemo } from 'react';
import type { User } from '@prisma/client';
import type { WorkspaceMember } from '@/types/types';

export const useOtherUsers = (
  members: WorkspaceMember[] | undefined,
  currentUser: User | null | undefined
) => {
  const otherUsers = useMemo(() => {
    if (!members || !currentUser) {
      return [];
    }

    return members.filter((member) => member.user.id !== currentUser.id);
  }, [members, currentUser]);

  return otherUsers;
};
