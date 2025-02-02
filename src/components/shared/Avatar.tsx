import { User } from '@prisma/client';
import Image from 'next/image';
import React from 'react';

interface AvatarProps {
  currentUser: User;
}

export const Avatar: React.FC<AvatarProps> = ({ currentUser }) => {
  return (
    <div className="flex items-center gap-3">
      <div className="relatizve w-10 h-10 rounded-full overflow-hidden">
        <Image
          alt="Profile"
          src={currentUser?.image || '/images/avatarplaceholder.png'}
          width={40}
          height={40}
          className="object-cover"
        />
      </div>

      <div className="flex flex-col text-sm md:text-base">
        <h3 className="font-semibold text-gray-800 text-sm truncate max-w-[150px]">
          {currentUser?.name || 'Guest User'}
        </h3>
        <p className="text-gray-500 text-sm truncate max-w-[150px]">
          {currentUser?.email || 'No email'}
        </p>
      </div>
    </div>
  );
};
