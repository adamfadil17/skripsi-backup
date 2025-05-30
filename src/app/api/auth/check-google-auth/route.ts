import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prismadb";
import { authOptions } from "@/lib/auth-options";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          hasGoogleAuth: false,
          hasCalendarScope: false,
          isTokenExpired: true,
          hasRefreshToken: false,
        },
        { status: 200 }
      );
    }

    // Check if there's a token refresh error in the session
    if (session.error === "RefreshAccessTokenError") {
      return NextResponse.json(
        {
          hasGoogleAuth: true,
          hasCalendarScope: false,
          isTokenExpired: true,
          hasRefreshToken: false,
          error: "Token refresh failed, please sign in again",
        },
        { status: 200 }
      );
    }

    // Get the user's Google account from database for scope checking
    const userAccount = await prisma.account.findFirst({
      where: {
        user: {
          email: session.user.email,
        },
        provider: "google",
      },
      select: {
        access_token: true,
        refresh_token: true,
        expires_at: true,
        scope: true,
      },
    });

    if (!userAccount) {
      return NextResponse.json(
        {
          hasGoogleAuth: false,
          hasCalendarScope: false,
          isTokenExpired: true,
          hasRefreshToken: false,
        },
        { status: 200 }
      );
    }

    // Check if calendar scope is included
    const hasCalendarScope =
      userAccount.scope?.includes("https://www.googleapis.com/auth/calendar") ||
      false;

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    const isTokenExpired =
      userAccount.expires_at && userAccount.expires_at < now;

    // If we have a session accessToken but the database shows expired,
    // trust the session since it might have been refreshed
    const tokenStatus = session.accessToken ? false : isTokenExpired;

    return NextResponse.json(
      {
        hasGoogleAuth: true,
        hasCalendarScope,
        isTokenExpired: tokenStatus,
        hasRefreshToken: !!userAccount.refresh_token,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error checking Google auth:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
