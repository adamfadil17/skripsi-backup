import bcrypt from "bcrypt";
import NextAuth, { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { JWT } from "next-auth/jwt";

import prisma from "@/lib/prismadb";

// Function to refresh Google access token
async function refreshAccessToken(token: JWT) {
  try {
    const url = "https://oauth2.googleapis.com/token";

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    // Calculate expiry time
    const expiresAt = Math.floor(
      Date.now() / 1000 + refreshedTokens.expires_in
    );

    // Update the database with the new token information
    if (token.userId) {
      await prisma.account.updateMany({
        where: {
          userId: token.userId as string,
          provider: "google",
        },
        data: {
          access_token: refreshedTokens.access_token,
          expires_at: expiresAt,
          refresh_token: refreshedTokens.refresh_token ?? token.refreshToken,
        },
      });
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          access_type: "offline",
          response_type: "code",
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar",
          prompt: "consent", // This ensures we get a refresh token
        },
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user?.hashedPassword) {
          throw new Error("Invalid credentials");
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials");
        }

        return user;
      },
    }),
  ],

  debug: process.env.NODE_ENV === "development",

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 1 day in seconds
  },

  callbacks: {
    jwt: async ({ token, account, user }) => {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + 60 * 60 * 1000, // Default to 1 hour if not provided
          user,
          provider: account.provider,
          userId: user.id, // Store user ID for database updates
        } as JWT;
      }

      // Return previous token if the access token has not expired yet
      const accessTokenExpires = token.accessTokenExpires as number;
      const shouldRefresh = Date.now() > accessTokenExpires - 5 * 60 * 1000; // Refresh 5 minutes before expiry

      if (!shouldRefresh) {
        return token;
      }

      // Access token has expired, try to update it
      // Only refresh for providers that support refresh tokens (Google in this case)
      if (token.provider === "google" && token.refreshToken) {
        console.log("Refreshing access token...");
        return refreshAccessToken(token);
      }

      // For other providers or if refresh fails, return the token as is
      // The session will handle the expired state
      return token;
    },

    session: async ({ session, token }) => {
      // Add token data to session
      if (token.accessToken) {
        session.accessToken = token.accessToken;
      }

      if (token.error) {
        session.error = token.error;
      }

      session.user = token.user || session.user;

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
