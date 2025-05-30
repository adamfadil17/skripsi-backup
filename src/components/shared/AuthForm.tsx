"use client";
import React, { useCallback, useEffect, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import Button from "./Button";
import AuthSocialButton from "./AuthSocialButton";
import { FcGoogle } from "react-icons/fc";
import axios from "axios";
import toast from "react-hot-toast";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "./Input";

type Variant = "LOGIN" | "REGISTER";

// Komponen untuk handle search params dengan Suspense
function AuthFormContent() {
  const session = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [variant, setVariant] = useState<Variant>("LOGIN");
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Periksa error parameter di URL
    const error = searchParams?.get("error");
    if (error === "RefreshAccessTokenError") {
      toast.error(
        "Sesi Anda telah berakhir. Silakan login kembali untuk melanjutkan."
      );
    }
  }, [searchParams, isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    if (session?.status === "authenticated") {
      // Cek apakah ada inviteId di sessionStorage setelah login
      let inviteId: string | null = null;

      try {
        inviteId = sessionStorage.getItem("inviteId");
      } catch (error) {
        // Handle jika sessionStorage tidak tersedia
        console.warn("SessionStorage not available:", error);
      }

      if (inviteId) {
        try {
          sessionStorage.removeItem("inviteId"); // Hapus inviteId setelah digunakan
        } catch (error) {
          console.warn("Failed to remove inviteId from sessionStorage:", error);
        }
        router.push(`/invitation/${inviteId}`);
      } else {
        router.push("/dashboard"); // Jika tidak ada inviteId, arahkan ke dashboard
      }
    }
  }, [session?.status, router, isMounted]);

  const toggleVariant = useCallback(() => {
    if (variant === "LOGIN") {
      setVariant("REGISTER");
    } else {
      setVariant("LOGIN");
    }
  }, [variant]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  // Fungsi khusus untuk Sign Up
  const signUp = async (data: FieldValues) => {
    setIsLoading(true);

    try {
      // Mengirim data registrasi ke API
      await axios.post("/api/register", data);
      toast.success("Account created successfully!");

      // Otomatis login setelah registrasi berhasil
      const signInResult = await signIn("credentials", {
        ...data,
        redirect: false,
      });

      return signInResult;
    } catch (error) {
      toast.error("Something went wrong during registration!");
      setIsLoading(false);
      throw error;
    }
  };

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    setIsLoading(true);

    if (variant === "REGISTER") {
      signUp(data)
        .then((callback) => {
          if (callback?.error) {
            toast.error("Failed to login after registration");
          } else {
            toast.success("Logged in successfully");
          }
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    } else if (variant === "LOGIN") {
      signIn("credentials", {
        ...data,
        redirect: false,
      })
        .then((callback) => {
          if (callback?.error) {
            toast.error("Invalid credentials");
          }

          if (callback?.ok && !callback.error) {
            toast.success("Logged in");
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
          toast.error("Invalid credentials");
        }

        if (callback?.ok && !callback.error) {
          toast.success("Logged in");
        }
      })
      .finally(() => setIsLoading(false));
  };

  // Loading state untuk hydration
  if (!isMounted) {
    return (
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mt-6">
          <div className="mb-6 flex gap-2">
            <div className="h-12 bg-gray-200 rounded animate-pulse w-full"></div>
          </div>
          <div className="mt-4 space-y-6">
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
      <div className="mt-6">
        <div className="mb-6 flex gap-2">
          <AuthSocialButton
            icon={FcGoogle}
            socialName={
              variant === "LOGIN"
                ? "Sign in with Google"
                : "Sign up with Google"
            }
            onClick={() => socialAction("google")}
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
        {variant === "REGISTER" && (
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
            {variant === "LOGIN" ? "Sign in" : "Sign up"}
          </Button>
        </div>
      </form>

      <div className="flex gap-2 justify-center text-sm mt-6 px-2 text-gray-500">
        <div>
          {variant === "LOGIN"
            ? "Don't have an account?"
            : "Do you have an account?"}
        </div>
        <div
          onClick={toggleVariant}
          className="text-primary font-semibold cursor-pointer"
        >
          {variant === "LOGIN" ? "Sign up now!" : "Sign in now!"}
        </div>
      </div>
    </div>
  );
}

// Komponen utama dengan Suspense boundary
const AuthForm = () => {
  return <AuthFormContent />;
};

export default AuthForm;
