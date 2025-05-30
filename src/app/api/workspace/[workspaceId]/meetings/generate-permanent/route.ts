import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prismadb';
import { google } from 'googleapis';
import { authOptions } from '@/lib/auth-options';

export async function POST(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'You must be signed in to generate meeting links' },
        { status: 401 }
      );
    }

    const { workspaceId } = params;

    // Check if user has access to this workspace
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: {
          email: session.user.email,
        },
      },
      include: {
        workspace: {
          select: {
            name: true,
            googleMeetUrl: true,
          },
        },
      },
    });

    if (!workspaceMember) {
      return NextResponse.json(
        { error: "You don't have access to this workspace" },
        { status: 403 }
      );
    }

    // If workspace already has a Google Meet URL, return it
    if (workspaceMember.workspace.googleMeetUrl) {
      return NextResponse.json({
        googleMeetUrl: workspaceMember.workspace.googleMeetUrl,
        message: 'Permanent meeting link already exists',
      });
    }

    // Get the user's Google account with fresh tokens
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
      },
    });

    if (!userAccount) {
      return NextResponse.json(
        {
          error:
            'No Google account found. Please sign in with Google to generate meeting links.',
        },
        { status: 401 }
      );
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    const isTokenExpired =
      userAccount.expires_at && userAccount.expires_at < now;

    if (isTokenExpired && !userAccount.refresh_token) {
      return NextResponse.json(
        {
          error:
            'Google access token expired and no refresh token available. Please sign in again.',
        },
        { status: 401 }
      );
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL
    );

    // Set credentials
    oauth2Client.setCredentials({
      access_token: userAccount.access_token,
      refresh_token: userAccount.refresh_token,
    });

    // If token is expired, try to refresh it
    if (isTokenExpired && userAccount.refresh_token) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();

        // Update the database with new tokens
        await prisma.account.updateMany({
          where: {
            userId: (
              await prisma.user.findUnique({
                where: { email: session.user.email },
              })
            )?.id,
            provider: 'google',
          },
          data: {
            access_token: credentials.access_token,
            expires_at: credentials.expiry_date
              ? Math.floor(credentials.expiry_date / 1000)
              : null,
            refresh_token:
              credentials.refresh_token || userAccount.refresh_token,
          },
        });

        // Update OAuth2 client with new credentials
        oauth2Client.setCredentials(credentials);
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        return NextResponse.json(
          {
            error:
              'Failed to refresh Google access token. Please sign in again.',
          },
          { status: 401 }
        );
      }
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Create a permanent meeting
    const event = {
      summary: `${workspaceMember.workspace.name} Permanent Meeting Room`,
      description: `Permanent meeting room for ${workspaceMember.workspace.name} workspace`,
      start: {
        dateTime: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ).toISOString(), // 1 year from now
        timeZone: 'UTC',
      },
      end: {
        dateTime: new Date(
          Date.now() + 366 * 24 * 60 * 60 * 1000
        ).toISOString(), // 1 year + 1 day from now
        timeZone: 'UTC',
      },
      conferenceData: {
        createRequest: {
          requestId: `workspace-${workspaceId}-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
    });

    const meetLink = response.data.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === 'video'
    )?.uri;

    if (!meetLink) {
      throw new Error('Failed to generate Google Meet link');
    }

    // Update workspace with new Google Meet URL
    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { googleMeetUrl: meetLink },
      select: {
        id: true,
        name: true,
        googleMeetUrl: true,
      },
    });

    // Create a notification about the new meeting URL
    await prisma.notification.create({
      data: {
        workspaceId,
        message: 'Permanent meeting link has been generated',
        type: 'WORKSPACE_UPDATE',
        userId: (
          await prisma.user.findUnique({ where: { email: session.user.email } })
        )?.id,
      },
    });

    return NextResponse.json({
      googleMeetUrl: updatedWorkspace.googleMeetUrl,
      message: 'Permanent meeting link generated successfully',
    });
  } catch (error) {
    console.error('Error generating permanent meeting link:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (
        error.message.includes('Invalid Credentials') ||
        error.message.includes('invalid_token')
      ) {
        return NextResponse.json(
          {
            error:
              'Google authentication failed. Please sign out and sign in again with Google.',
          },
          { status: 401 }
        );
      }
      if (error.message.includes('insufficient permissions')) {
        return NextResponse.json(
          {
            error:
              "Insufficient permissions to create calendar events. Please ensure you've granted calendar access.",
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate permanent meeting link',
      },
      { status: 500 }
    );
  }
}
