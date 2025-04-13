// File: types/next-auth.d.ts
import 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    error?: string;
    user: {
      id?: string;
      name?: string;
      email?: string;
      image?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
    user?: {
      id?: string;
      name?: string;
      email?: string;
      image?: string;
    };
    // Tambahkan properti dasar JWT
    name?: string;
    email?: string;
    picture?: string;
    sub?: string;
    // Tambahkan index signature untuk memungkinkan akses properti lain
    [key: string]: unknown;
  }
}
