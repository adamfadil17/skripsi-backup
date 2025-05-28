import { type NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prismadb';

export async function POST(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || !session?.accessToken) {
      return NextResponse.json(
        { error: 'You must be signed in with Google to create meetings' },
        { status: 401 }
      );
    }

    const { workspaceId } = params;
    const { title, description, duration, organizerEmail } =
      await request.json();

    // Validate required fields
    if (!title || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user has access to this workspace
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: {
          email: session.user.email,
        },
      },
    });

    if (!workspaceMember) {
      return NextResponse.json(
        { error: "You don't have access to this workspace" },
        { status: 403 }
      );
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

    // Calculate start and end times
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration * 60000);

    // Create calendar event with Google Meet
    const event = {
      summary: title,
      description: description || `Meeting for workspace: ${workspaceId}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: [{ email: organizerEmail }],
      conferenceData: {
        createRequest: {
          requestId: `meet-${workspaceId}-${Date.now()}`,
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

    // Create a notification about the new meeting
    await prisma.notification.create({
      data: {
        workspaceId,
        message: `New meeting created: ${title}`,
        type: 'WORKSPACE_UPDATE',
        userId: (
          await prisma.user.findUnique({ where: { email: session.user.email } })
        )?.id,
      },
    });

    return NextResponse.json({
      meetLink,
      eventId: response.data.id,
      title: response.data.summary,
      startTime: response.data.start?.dateTime,
      endTime: response.data.end?.dateTime,
      isPermanent: false,
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to create meeting',
      },
      { status: 500 }
    );
  }
}
