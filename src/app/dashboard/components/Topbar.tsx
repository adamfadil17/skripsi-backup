// 'use client';
import { User } from '@prisma/client';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import Avatar from '@/components/shared/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import SignOutButton from '@/components/shared/SignOutButton';
import { signOut } from 'next-auth/react';

interface TopbarProps {
  currentUser: User;
}

const Topbar = ({ currentUser }: TopbarProps) => {
  return (
    <div className="sticky top-0 z-30 flex w-full h-[70px] items-center justify-between bg-white px-6 md:px-32 shadow-md">
      <Link href="/dashboard" className="flex items-center gap-4">
        <Image src="/images/logo.png" alt="logo" width={32} height={32} />
        <h2 className="font-semibold text-lg text-primary hidden sm:block">
          Catatan Cerdas
        </h2>
      </Link>

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

export default Topbar;
