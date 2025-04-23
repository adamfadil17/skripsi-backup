'use client';
import useActiveChannel from '@/hooks/use-active-channel';

const ActiveStatus = () => {
  useActiveChannel(); // This is correct
  return null;
};

export default ActiveStatus;
