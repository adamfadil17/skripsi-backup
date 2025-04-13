'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { FieldValues, SubmitHandler, useForm } from 'react-hook-form';
import Button from './Button';
import AuthSocialButton from './AuthSocialButton';
import { FcGoogle } from 'react-icons/fc';
import axios from 'axios';
import toast from 'react-hot-toast';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Input from './Input';

type Variant = 'LOGIN' | 'REGISTER';

const AuthForm = () => {
  const session = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [variant, setVariant] = useState<Variant>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Periksa error parameter di URL
    const error = searchParams?.get('error');
    if (error === 'RefreshAccessTokenError') {
      toast.error(
        'Sesi Anda telah berakhir. Silakan login kembali untuk melanjutkan.'
      );
    }
  }, [searchParams]);

  useEffect(() => {
    if (session?.status === 'authenticated') {
      // Cek apakah ada inviteId di sessionStorage setelah login
      const inviteId = sessionStorage.getItem('inviteId');

      if (inviteId) {
        sessionStorage.removeItem('inviteId'); // Hapus inviteId setelah digunakan
        router.push(`/invitation/${inviteId}`);
      } else {
        router.push('/dashboard'); // Jika tidak ada inviteId, arahkan ke dashboard
      }
    }
  }, [session?.status, router]);

  const toggleVariant = useCallback(() => {
    if (variant === 'LOGIN') {
      setVariant('REGISTER');
    } else {
      setVariant('LOGIN');
    }
  }, [variant]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    setIsLoading(true);

    if (variant === 'REGISTER') {
      axios
        .post('/api/register', data)
        .then(() => signIn('credentials', data))
        .catch(() => toast.error('Something went wrong!'))
        .finally(() => setIsLoading(false));
    }

    if (variant === 'LOGIN') {
      signIn('credentials', {
        ...data,
        redirect: false,
      })
        .then((callback) => {
          if (callback?.error) {
            toast.error('Invalid credentials');
          }

          if (callback?.ok && !callback.error) {
            toast.success('Logged in');
          }
        })
        .finally(() => setIsLoading(false));
    }
  };

  const socialAction = (action: string) => {
    setIsLoading(true);

    signIn(action, { redirect: false })
      .then((callback) => {
        if (callback?.error) {
          toast.error('Invalid credentials');
        }

        if (callback?.ok && !callback.error) {
          toast.success('Logged in');
        }
      })
      .finally(() => setIsLoading(false));
  };

  // const socialAction = (action: string) => {
  //   setIsLoading(true);

  //   // Tambahkan prompt=consent untuk memaksa dialog persetujuan Google setiap kali
  //   // Ini akan memastikan refresh token baru setiap kali login
  //   const options = {
  //     redirect: false,
  //     ...(action === 'google' ? { prompt: 'consent' } : {}),
  //   };

  //   signIn(action, options)
  //     .then((callback) => {
  //       if (callback?.error) {
  //         toast.error('Invalid credentials');
  //       }

  //       if (callback?.ok && !callback.error) {
  //         toast.success('Logged in');
  //       }
  //     })
  //     .finally(() => setIsLoading(false));
  // };

  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
      <div className="mt-6">
        <div className="mb-6 flex gap-2">
          <AuthSocialButton
            icon={FcGoogle}
            socialName={
              variant === 'LOGIN'
                ? 'Sign in with Google'
                : 'Sign up with Google'
            }
            onClick={() => socialAction('google')}
          />
        </div>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Or with</span>
          </div>
        </div>
      </div>
      <form className="mt-4 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {variant === 'REGISTER' && (
          <Input
            id="name"
            label="Name"
            placeholder="Enter your name"
            register={register}
            errors={errors}
          />
        )}
        <Input
          id="email"
          label="Email address"
          placeholder="Enter your email address"
          type="email"
          register={register}
          errors={errors}
        />
        <Input
          id="password"
          label="Password"
          placeholder="Enter your password"
          type="password"
          register={register}
          errors={errors}
        />
        <div>
          <Button disabled={isLoading} fullWidth type="submit">
            {variant === 'LOGIN' ? 'Sign in' : 'Sign up'}
          </Button>
        </div>
      </form>

      <div className="flex gap-2 justify-center text-sm mt-6 px-2 text-gray-500">
        <div>
          {variant === 'LOGIN'
            ? "Don't have an account?"
            : 'Do you have an account?'}
        </div>
        <div
          onClick={toggleVariant}
          className="text-primary font-semibold cursor-pointer"
        >
          {variant === 'LOGIN' ? 'Sign up now!' : 'Sign in now!'}
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
