'use client';
import React, { useState } from 'react';
import { MdAlternateEmail } from 'react-icons/md';
import { VscEyeClosed, VscEye } from 'react-icons/vsc';

import clsx from 'clsx';
import { FieldErrors, FieldValues, UseFormRegister } from 'react-hook-form';

interface InputProps {
  label: string;
  placeholder: string;
  id: string;
  type?: string;
  required?: boolean;
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors;
  disabled?: boolean;
}

export const Input = ({
  label,
  placeholder,
  id,
  type = 'text',
  required,
  register,
  errors,
  disabled,
}: InputProps) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev);
  };

  return (
    <div>
      <label
        className="block text-sm font-medium leading-6 text-primary"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          placeholder={placeholder}
          type={id === 'password' && !isPasswordVisible ? 'password' : 'text'}
          autoComplete={id}
          disabled={disabled}
          {...register(id, { required })}
          className={clsx(
            `
            form-input block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset bg-gray-100 ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6`,
            errors[id] && 'focus:ring-rose-500',
            disabled && 'opacity-50 cursor-default'
          )}
        />
        <div className="absolute inset-y-0 right-3 flex items-center pr-2">
          {type === 'email' && <MdAlternateEmail className="text-gray-500" />}
          {type === 'password' && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              aria-label="Toggle password visibility"
              className="p-1"
            >
              {isPasswordVisible ? (
                <VscEye className="text-gray-500" />
              ) : (
                <VscEyeClosed className="text-gray-500" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
