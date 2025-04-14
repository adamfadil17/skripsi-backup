import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getGoogleCalendarClient } from '@/lib/google-calendar';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

interface SuggestedTimeSlot {
  startDateTime: string;
  endDateTime: string;
}

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
    const { startDateTime, endDateTime, attendeeIds } = body;

    // Validate required fields
    if (!startDateTime || !endDateTime || !attendeeIds || !attendeeIds.length) {
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

    // Get all attendees from workspace members with their Google accounts
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        userId: {
          in: attendeeIds,
        },
      },
      include: {
        user: {
          include: {
            accounts: {
              where: {
                provider: 'google',
              },
            },
          },
        },
      },
    });

    // Map to the user data we need
    const attendees = workspaceMembers.map((member) => member.user);

    // Check availability for each attendee
    const availabilityResults = await Promise.all(
      attendees.map(async (attendee) => {
        // Skip if user doesn't have a Google account
        if (!attendee.accounts || attendee.accounts.length === 0) {
          return {
            userId: attendee.id,
            name: attendee.name,
            email: attendee.email,
            available: true, // Assume available if no Google account
            reason: 'No Google Calendar connected',
          };
        }

        const calendar = await getGoogleCalendarClient(attendee.id);
        if (!calendar) {
          return {
            userId: attendee.id,
            name: attendee.name,
            email: attendee.email,
            available: true, // Assume available if can't access calendar
            reason: 'Could not access Google Calendar',
          };
        }

        try {
          // Query freebusy to check availability
          const freeBusyQuery = {
            timeMin: new Date(startDateTime).toISOString(),
            timeMax: new Date(endDateTime).toISOString(),
            items: [{ id: 'primary' }],
          };

          const freeBusyResponse = await calendar.freebusy.query({
            requestBody: freeBusyQuery,
          });

          const busySlots =
            freeBusyResponse.data.calendars?.primary?.busy || [];
          const isAvailable = busySlots.length === 0;

          return {
            userId: attendee.id,
            name: attendee.name,
            email: attendee.email,
            available: isAvailable,
            reason: isAvailable ? 'Available' : 'Has conflicting events',
            conflicts: busySlots,
          };
        } catch (error) {
          console.error(
            `Error checking availability for ${attendee.email}:`,
            error
          );
          return {
            userId: attendee.id,
            name: attendee.name,
            email: attendee.email,
            available: true, // Assume available if error
            reason: 'Error checking calendar',
          };
        }
      })
    );

    // Calculate overall availability
    const allAvailable = availabilityResults.every(
      (result) => result.available
    );
    const noneAvailable = availabilityResults.every(
      (result) => !result.available
    );

    let status = 'AVAILABLE'; // Green
    if (noneAvailable) {
      status = 'UNAVAILABLE'; // Red
    } else if (!allAvailable) {
      status = 'PARTIAL'; // Yellow
    }

    // If not all available, suggest alternative times
    let suggestedTimes: SuggestedTimeSlot[] = [];
    if (!allAvailable) {
      // Get suggested times in 30-minute increments for the same day
      const startDate = new Date(startDateTime);
      const endDate = new Date(endDateTime);
      const duration = endDate.getTime() - startDate.getTime();

      // Create suggestions from 9 AM to 5 PM
      const baseDate = new Date(startDate);
      baseDate.setHours(9, 0, 0, 0);

      const suggestions: SuggestedTimeSlot[] = [];
      for (let i = 0; i < 16; i++) {
        // 16 half-hour slots from 9 AM to 5 PM
        const suggestionStart = new Date(baseDate);
        suggestionStart.setMinutes(baseDate.getMinutes() + i * 30);

        const suggestionEnd = new Date(suggestionStart);
        suggestionEnd.setTime(suggestionStart.getTime() + duration);

        // Skip the current time slot that was already checked
        if (suggestionStart.getTime() === startDate.getTime()) {
          continue;
        }

        suggestions.push({
          startDateTime: suggestionStart.toISOString(),
          endDateTime: suggestionEnd.toISOString(),
        });
      }

      // Check availability for each suggestion (simplified - in a real app, you'd batch these)
      // For this demo, we'll just provide the suggestions without checking
      suggestedTimes = suggestions.slice(0, 3); // Limit to 3 suggestions
    }

    return NextResponse.json({
      status,
      attendees: availabilityResults,
      suggestedTimes,
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}
