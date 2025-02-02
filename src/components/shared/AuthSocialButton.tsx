import React from 'react';
import { IconType } from 'react-icons';

interface AuthSocialButtonProps {
  icon: IconType;
  socialName: string;
  onClick: () => void;
}

export const AuthSocialButton: React.FC<AuthSocialButtonProps> = ({
  icon: Icon,
  socialName,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-full justify-center items-center gap-2 rounded-md bg-white px-4 py-2 font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
    >
      <Icon /> {socialName}
    </button>
  );
};

