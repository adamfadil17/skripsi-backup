// app/providers/pusher-channel-provider.tsx
'use client';

import { useEffect, useMemo, useState, createContext, useContext } from 'react';
import { pusherClient } from '@/lib/pusher';
import type { Channel } from 'pusher-js';

interface PusherChannelContextType {
  channel: Channel | null;
}

const PusherChannelContext = createContext<PusherChannelContextType>({
  channel: null,
});

interface PusherChannelProviderProps {
  channelName: string;
  children: React.ReactNode;
}

export function PusherChannelProvider({
  channelName,
  children,
}: PusherChannelProviderProps) {
  const [channel, setChannel] = useState<Channel | null>(null);

  useEffect(() => {
    if (!channelName) return;

    const instance = pusherClient.subscribe(channelName);
    setChannel(instance);

    return () => {
      pusherClient.unsubscribe(channelName);
    };
  }, [channelName]);

  const value = useMemo(() => ({ channel }), [channel]);

  return (
    <PusherChannelContext.Provider value={value}>
      {children}
    </PusherChannelContext.Provider>
  );
}

export function usePusherChannelContext() {
  return useContext(PusherChannelContext);
}
