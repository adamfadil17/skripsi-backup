import { useEffect, useRef } from 'react';
import useActiveList from './use-active-list';
import { pusherClient } from '@/lib/pusher';
import { Channel, Members } from 'pusher-js';

const useActiveChannel = () => {
  const { members, add, remove, set } = useActiveList();
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    if (!channelRef.current) {
      channelRef.current = pusherClient.subscribe('presence-messenger');
    }

    const channel = channelRef.current;

    channel.bind('pusher:subscription_succeeded', (members: Members) => {
      const initialMembers: string[] = [];

      members.each((member: Record<string, any>) =>
        initialMembers.push(member.id)
      );
      set(initialMembers);
    });

    channel.bind('pusher:member_added', (member: Record<string, any>) => {
      add(member.id);
    });

    channel.bind('pusher:member_removed', (member: Record<string, any>) => {
      remove(member.id);
    });

    return () => {
      if (channelRef.current) {
        channel.unbind('pusher:subscription_succeeded');
        channel.unbind('pusher:member_added');
        channel.unbind('pusher:member_removed');
        pusherClient.unsubscribe('presence-messenger');
        channelRef.current = null;
      }
    };
  }, [set, add, remove]);
};

export default useActiveChannel;
