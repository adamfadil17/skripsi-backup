import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getGoogleCalendarClient } from '@/lib/google-calendar';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

// GET - List all meetings for a workspace
export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = params.workspaceId;

    // Check if user is a member of the workspace
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: currentUser.id,
      },
    });

    if (!workspaceMember) {
      return NextResponse.json(
        { error: 'You are not a member of this workspace' },
        { status: 403 }
      );
    }

    // Get meetings for the workspace
    const meetings = await prisma.meeting.findMany({
      where: {
        workspaceId,
      },
      include: {
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        startDateTime: 'asc',
      },
    });

    return NextResponse.json(meetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}

// POST - Create a new meeting
export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = params.workspaceId;
    const body = await req.json();
    const { title, description, startDateTime, endDateTime, attendeeIds } =
      body;

    // Validate required fields
    if (!title || !startDateTime || !endDateTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user is a member of the workspace
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: currentUser.id,
      },
    });

    if (!workspaceMember) {
      return NextResponse.json(
        { error: 'You are not a member of this workspace' },
        { status: 403 }
      );
    }

    // Verify all attendees are members of the workspace
    if (attendeeIds && attendeeIds.length > 0) {
      const workspaceMembers = await prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          userId: {
            in: attendeeIds,
          },
        },
      });

      // Check if all attendee IDs are valid workspace members
      if (workspaceMembers.length !== attendeeIds.length) {
        return NextResponse.json(
          { error: 'Some selected users are not members of this workspace' },
          { status: 400 }
        );
      }
    }

    // First, try to create the event in Google Calendar to get a real Meet link
    let googleCalendarId = null;
    let googleEventId = null;
    let meetingLink = null;

    const calendar = await getGoogleCalendarClient(currentUser.id);
    if (calendar) {
      try {
        // Get attendee emails from workspace members
        const workspaceMembers = await prisma.workspaceMember.findMany({
          where: {
            workspaceId,
            userId: {
              in: [...attendeeIds, currentUser.id],
            },
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        });

        const attendeeEmails = workspaceMembers.map((member) => ({
          email: member.user.email,
        }));

        const event = {
          summary: title,
          description: description || '',
          start: {
            dateTime: new Date(startDateTime).toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: new Date(endDateTime).toISOString(),
            timeZone: 'UTC',
          },
          attendees: attendeeEmails,
          conferenceData: {
            createRequest: {
              requestId: `${workspaceId}-${Date.now()}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        };

        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event,
          conferenceDataVersion: 1,
          sendUpdates: 'all',
        });

        if (response.data.id) {
          googleCalendarId = 'primary';
          googleEventId = response.data.id;
          meetingLink = response.data.hangoutLink;
        }
      } catch (error) {
        console.error('Error creating Google Calendar event:', error);
        // Continue with the local meeting even if Google Calendar fails
      }
    }

    // If we couldn't get a Google Meet link, generate a placeholder
    if (!meetingLink) {
      meetingLink = `Link will be shared later.`;
    }

    // Create meeting in database with the Google Calendar info if available
    const meeting = await prisma.meeting.create({
      data: {
        title,
        description,
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime),
        workspaceId,
        createdById: currentUser.id,
        meetingLink,
        googleCalendarId,
        googleEventId,
      },
    });

    // Add attendees
    if (attendeeIds && attendeeIds.length > 0) {
      const attendeePromises = attendeeIds.map((userId: string) =>
        prisma.meetingAttendee.create({
          data: {
            meetingId: meeting.id,
            userId,
          },
        })
      );

      await Promise.all(attendeePromises);
    }

    // Add the creator as an attendee as well
    await prisma.meetingAttendee.create({
      data: {
        meetingId: meeting.id,
        userId: currentUser.id,
        status: 'ACCEPTED',
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        workspaceId,
        message: `${currentUser.name} created a new meeting: ${title}`,
        type: 'MEETING_CREATE',
      },
    });

    // Fetch the complete meeting with attendees
    const completeMeeting = await prisma.meeting.findUnique({
      where: { id: meeting.id },
      include: {
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(completeMeeting);
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json(
      { error: 'Failed to create meeting' },
      { status: 500 }
    );
  }
}
