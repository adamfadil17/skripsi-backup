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

    if (!session?.user?.email || !session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = params;

    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: {
          email: session.user.email,
        },
        role: {
          in: ['ADMIN', 'SUPER_ADMIN'],
        },
      },
      include: {
        workspace: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!workspaceMember) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL
    );

    oauth2Client.setCredentials({
      access_token: session.accessToken as string,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary: `${workspaceMember.workspace.name} Permanent Meeting Room`,
      description: `Permanent meeting room for ${workspaceMember.workspace.name} workspace`,
      start: {
        dateTime: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ).toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: new Date(
          Date.now() + 366 * 24 * 60 * 60 * 1000
        ).toISOString(),
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

    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { googleMeetUrl: meetLink },
      select: {
        id: true,
        name: true,
        googleMeetUrl: true,
      },
    });

    await prisma.notification.create({
      data: {
        workspaceId,
        message: 'Workspace meeting link has been regenerated',
        type: 'WORKSPACE_UPDATE',
        userId: (
          await prisma.user.findUnique({ where: { email: session.user.email } })
        )?.id,
      },
    });

    return NextResponse.json(updatedWorkspace);
  } catch (error) {
    console.error('Error regenerating meeting link:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to regenerate meeting link',
      },
      { status: 500 }
    );
  }
}
