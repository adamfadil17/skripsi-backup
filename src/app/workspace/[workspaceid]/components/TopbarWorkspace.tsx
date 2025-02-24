// 'use client';
import { User } from '@prisma/client';
import React from 'react';
import Avatar from '@/components/shared/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import SignOutButton from '@/components/shared/SignOutButton';

interface TopbarWorkspaceProps {
  currentUser: User;
}

const TopbarWorkspace = ({ currentUser }: TopbarWorkspaceProps) => {
  return (
    <div className="sticky top-0 z-30 flex w-full h-[70px] items-center justify-end bg-white px-6 shadow-md">
      <DropdownMenu>
        <DropdownMenuTrigger
          asChild
          className="px-2 py-1 cursor-pointer rounded-md hover:bg-gray-100"
        >
          <Avatar currentUser={currentUser} />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="mt-3 w-56">
          <SignOutButton />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default TopbarWorkspace;
