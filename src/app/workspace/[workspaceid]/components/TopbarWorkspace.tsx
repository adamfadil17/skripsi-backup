'use client';
import type { User } from '@prisma/client';
import Avatar from '@/components/shared/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import SignOutButton from '@/components/shared/SignOutButton';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Menu } from 'lucide-react';

interface TopbarWorkspaceProps {
  currentUser: User;
}

const TopbarWorkspace = ({ currentUser }: TopbarWorkspaceProps) => {
  return (
    <div className="sticky top-0 z-10 flex w-full h-[70px] items-center justify-between bg-white px-4 md:px-6 shadow-md">
      <SidebarTrigger className="md:hidden">
        <Menu className="h-5 w-5" />
      </SidebarTrigger>

      <div className="flex-1" />

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
