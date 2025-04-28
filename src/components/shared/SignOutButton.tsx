'use client';
import { signOut } from 'next-auth/react';
import React from 'react';
import { HiOutlineLogout } from 'react-icons/hi';
import { DropdownMenuItem } from '../ui/dropdown-menu';
import { useRouter } from 'next/navigation';

const SignOutButton = () => {
  const route = useRouter();
  const handleSignOut = async () => {
    await signOut({ redirect: false });
    route.push('/');
  };
  return (
    <DropdownMenuItem
      className="text-primary focus:text-primary cursor-pointer focus:bg-gray-50"
      onClick={handleSignOut}
    >
      <div className="flex items-center gap-1">
        <HiOutlineLogout /> Sign out
      </div>
    </DropdownMenuItem>
  );
};

export default SignOutButton;
