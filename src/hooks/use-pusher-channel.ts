'use client';

import { useEffect, useState } from 'react';
import { pusherClient } from '@/lib/pusher';
import type { Channel } from 'pusher-js';

export function usePusherChannel(channelName: string) {
  const [channel, setChannel] = useState<Channel | null>(null);

  useEffect(() => {
    if (!channelName) return;

    const channelInstance = pusherClient.subscribe(channelName);
    setChannel(channelInstance);

    return () => {
      pusherClient.unsubscribe(channelName);
    };
  }, [channelName]);

  return channel;
}
