import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prismadb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the user's Google account
    const userAccount = await prisma.account.findFirst({
      where: {
        user: {
          email: session.user.email,
        },
        provider: 'google',
      },
      select: {
        access_token: true,
        refresh_token: true,
        expires_at: true,
        scope: true,
      },
    });

    if (!userAccount) {
      return NextResponse.json({
        hasGoogleAuth: false,
        message: 'No Google account connected',
      });
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    const isTokenExpired =
      userAccount.expires_at && userAccount.expires_at < now;

    // Check if calendar scope is included
    const hasCalendarScope = userAccount.scope?.includes('calendar') || false;

    return NextResponse.json({
      hasGoogleAuth: true,
      hasCalendarScope,
      isTokenExpired,
      hasRefreshToken: !!userAccount.refresh_token,
      expiresAt: userAccount.expires_at,
      scopes: userAccount.scope,
    });
  } catch (error) {
    console.error('Error checking Google auth:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
