import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getGoogleCalendarClient } from '@/lib/google-calendar';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

// GET - Get a specific meeting
export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceId: string; meetingId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, meetingId } = params;

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

    // Get the meeting
    const meeting = await prisma.meeting.findUnique({
      where: {
        id: meetingId,
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
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error('Error fetching meeting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting' },
      { status: 500 }
    );
  }
}

// PATCH - Update a meeting
export async function PATCH(
  req: NextRequest,
  { params }: { params: { workspaceId: string; meetingId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, meetingId } = params;
    const body = await req.json();
    const { title, description, startDateTime, endDateTime, attendeeIds } =
      body;

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

    // Get the existing meeting
    const existingMeeting = await prisma.meeting.findUnique({
      where: {
        id: meetingId,
        workspaceId,
      },
      include: {
        attendees: true,
      },
    });

    if (!existingMeeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Check if user is the creator or has admin/super_admin role
    const isCreator = existingMeeting.createdById === currentUser.id;
    const hasPermission =
      isCreator || ['ADMIN', 'SUPER_ADMIN'].includes(workspaceMember.role);

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to update this meeting' },
        { status: 403 }
      );
    }

    // Verify all attendees are members of the workspace if attendeeIds is provided
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

    // Update the meeting in the database
    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        startDateTime: startDateTime ? new Date(startDateTime) : undefined,
        endDateTime: endDateTime ? new Date(endDateTime) : undefined,
      },
    });

    // Update attendees if provided
    if (attendeeIds) {
      // Get current attendees
      const currentAttendeeIds = existingMeeting.attendees.map(
        (attendee) => attendee.userId
      );

      // Find attendees to remove
      const attendeesToRemove = currentAttendeeIds.filter(
        (id) => !attendeeIds.includes(id) && id !== existingMeeting.createdById
      );

      // Find attendees to add
      const attendeesToAdd = attendeeIds.filter(
        (id: string) => !currentAttendeeIds.includes(id)
      );

      // Remove attendees
      if (attendeesToRemove.length > 0) {
        await prisma.meetingAttendee.deleteMany({
          where: {
            meetingId,
            userId: { in: attendeesToRemove },
          },
        });
      }

      // Add new attendees
      if (attendeesToAdd.length > 0) {
        const attendeePromises = attendeesToAdd.map((userId: string) =>
          prisma.meetingAttendee.create({
            data: {
              meetingId,
              userId,
            },
          })
        );

        await Promise.all(attendeePromises);
      }
    }

    // Update the event in Google Calendar if it exists
    if (existingMeeting.googleCalendarId && existingMeeting.googleEventId) {
      const calendar = await getGoogleCalendarClient(currentUser.id);
      if (calendar) {
        try {
          // Get updated attendees
          const attendees = await prisma.meetingAttendee.findMany({
            where: { meetingId },
            include: { user: true },
          });

          const event = {
            summary: title || existingMeeting.title,
            description: description || existingMeeting.description || '',
            start: {
              dateTime: startDateTime
                ? new Date(startDateTime).toISOString()
                : existingMeeting.startDateTime.toISOString(),
              timeZone: 'UTC',
            },
            end: {
              dateTime: endDateTime
                ? new Date(endDateTime).toISOString()
                : existingMeeting.endDateTime.toISOString(),
              timeZone: 'UTC',
            },
            attendees: attendees.map((attendee) => ({
              email: attendee.user.email,
            })),
          };

          await calendar.events.update({
            calendarId: existingMeeting.googleCalendarId,
            eventId: existingMeeting.googleEventId,
            requestBody: event,
            sendUpdates: 'all',
          });
        } catch (error) {
          console.error('Error updating Google Calendar event:', error);
          // Continue with the local meeting update even if Google Calendar fails
        }
      }
    }

    // Create notification
    await prisma.notification.create({
      data: {
        workspaceId,
        message: `${currentUser.name} updated meeting: ${updatedMeeting.title}`,
        type: 'MEETING_UPDATE',
      },
    });

    // Fetch the complete updated meeting with attendees
    const completeUpdatedMeeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
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

    return NextResponse.json(completeUpdatedMeeting);
  } catch (error) {
    console.error('Error updating meeting:', error);
    return NextResponse.json(
      { error: 'Failed to update meeting' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a meeting
export async function DELETE(
  req: NextRequest,
  { params }: { params: { workspaceId: string; meetingId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, meetingId } = params;

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

    // Get the meeting
    const meeting = await prisma.meeting.findUnique({
      where: {
        id: meetingId,
        workspaceId,
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Check if user is the creator or has admin/super_admin role
    const isCreator = meeting.createdById === currentUser.id;
    const hasPermission =
      isCreator || ['ADMIN', 'SUPER_ADMIN'].includes(workspaceMember.role);

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this meeting' },
        { status: 403 }
      );
    }

    // Delete the event from Google Calendar if it exists
    if (meeting.googleCalendarId && meeting.googleEventId) {
      const calendar = await getGoogleCalendarClient(currentUser.id);
      if (calendar) {
        try {
          await calendar.events.delete({
            calendarId: meeting.googleCalendarId,
            eventId: meeting.googleEventId,
            sendUpdates: 'all',
          });
        } catch (error) {
          console.error('Error deleting Google Calendar event:', error);
          // Continue with the local meeting deletion even if Google Calendar fails
        }
      }
    }

    // Delete the meeting attendees first (cascade delete will handle this, but being explicit)
    await prisma.meetingAttendee.deleteMany({
      where: { meetingId },
    });

    // Delete the meeting
    await prisma.meeting.delete({
      where: { id: meetingId },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        workspaceId,
        message: `${currentUser.name} deleted meeting: ${meeting.title}`,
        type: 'MEETING_DELETE',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return NextResponse.json(
      { error: 'Failed to delete meeting' },
      { status: 500 }
    );
  }
}

// PUT - Update attendee status
export async function PUT(
  req: NextRequest,
  { params }: { params: { workspaceId: string; meetingId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, meetingId } = params;
    const body = await req.json();
    const { status } = body;

    if (!['ACCEPTED', 'DECLINED', 'TENTATIVE'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be ACCEPTED, DECLINED, or TENTATIVE' },
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

    // Check if the meeting exists
    const meeting = await prisma.meeting.findUnique({
      where: {
        id: meetingId,
        workspaceId,
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Check if the user is an attendee
    const attendee = await prisma.meetingAttendee.findUnique({
      where: {
        meetingId_userId: {
          meetingId,
          userId: currentUser.id,
        },
      },
    });

    if (!attendee) {
      return NextResponse.json(
        { error: 'You are not an attendee of this meeting' },
        { status: 403 }
      );
    }

    // Update the attendee status
    const updatedAttendee = await prisma.meetingAttendee.update({
      where: {
        meetingId_userId: {
          meetingId,
          userId: currentUser.id,
        },
      },
      data: {
        status,
      },
    });

    // Update the status in Google Calendar if the meeting has a Google Calendar event
    if (meeting.googleCalendarId && meeting.googleEventId) {
      const calendar = await getGoogleCalendarClient(currentUser.id);
      if (calendar) {
        try {
          // Get the event first to preserve other attendees
          const event = await calendar.events.get({
            calendarId: meeting.googleCalendarId,
            eventId: meeting.googleEventId,
          });

          // Map the status to Google Calendar status
          const googleStatus: Record<string, string> = {
            ACCEPTED: 'accepted',
            DECLINED: 'declined',
            TENTATIVE: 'tentative',
          };

          // Update only the current user's status
          const attendees = event.data.attendees || [];
          const updatedAttendees = attendees.map((a: any) => {
            if (a.email === currentUser.email) {
              return { ...a, responseStatus: googleStatus[status] };
            }
            return a;
          });

          // Update the event
          await calendar.events.patch({
            calendarId: meeting.googleCalendarId,
            eventId: meeting.googleEventId,
            requestBody: {
              attendees: updatedAttendees,
            },
          });
        } catch (error) {
          console.error('Error updating Google Calendar event:', error);
          // Continue with the local update even if Google Calendar fails
        }
      }
    }

    return NextResponse.json(updatedAttendee);
  } catch (error) {
    console.error('Error updating attendee status:', error);
    return NextResponse.json(
      { error: 'Failed to update attendee status' },
      { status: 500 }
    );
  }
}
