import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prismadb';
import { google } from 'googleapis';

export async function POST(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || !session?.accessToken) {
      return NextResponse.json(
        {
          error: 'You must be signed in with Google to generate meeting links',
        },
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

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL
    );

    // Use the access token from the session
    oauth2Client.setCredentials({
      access_token: session.accessToken as string,
    });

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
