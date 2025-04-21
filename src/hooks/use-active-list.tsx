'use client';

import { create } from 'zustand';
import { useEffect, useState } from 'react';
import { pusherClient } from '@/lib/pusher';

interface ActiveListStore {
  members: string[];
  add: (id: string) => void;
  remove: (id: string) => void;
  set: (ids: string[]) => void;
}

const useActiveListStore = create<ActiveListStore>((set) => ({
  members: [],
  add: (id) => set((state) => ({ members: [...state.members, id] })),
  remove: (id) =>
    set((state) => ({
      members: state.members.filter((memberId) => memberId !== id),
    })),
  set: (ids) => set({ members: ids }),
}));

export const useActiveList = () => {
  const { members, add, remove, set } = useActiveListStore();
  const [hasSubscribed, setHasSubscribed] = useState(false);

  useEffect(() => {
    if (!hasSubscribed) {
      pusherClient.subscribe('presence-global');

      // When a user comes online
      pusherClient.bind('user-online', (email: string) => {
        add(email);
      });

      // When a user goes offline
      pusherClient.bind('user-offline', (email: string) => {
        remove(email);
      });

      // Initial list of online users
      pusherClient.bind('active-users', (users: string[]) => {
        set(users);
      });

      setHasSubscribed(true);
    }

    return () => {
      if (hasSubscribed) {
        pusherClient.unsubscribe('presence-global');
        pusherClient.unbind('user-online');
        pusherClient.unbind('user-offline');
        pusherClient.unbind('active-users');
      }
    };
  }, [hasSubscribed, add, remove, set]);

  return { activeMembers: members };
};
