import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prismadb";
import { google } from "googleapis";
import { getFreshGoogleTokens } from "@/lib/auth-helpers";
import { authOptions } from "@/lib/auth-options";

// GET - Fetch a specific session meeting
export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string; meetingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to access session meetings" },
        { status: 401 }
      );
    }

    const { workspaceId, meetingId } = params;

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

    // Fetch the specific session meeting
    const sessionMeeting = await prisma.sessionMeeting.findFirst({
      where: {
        id: meetingId,
        workspaceId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!sessionMeeting) {
      return NextResponse.json(
        { error: "Session meeting not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(sessionMeeting);
  } catch (error) {
    console.error("Error fetching session meeting:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch session meeting",
      },
      { status: 500 }
    );
  }
}

// PUT - Update a session meeting
export async function PUT(
  request: NextRequest,
  { params }: { params: { workspaceId: string; meetingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to update meetings" },
        { status: 401 }
      );
    }

    const { workspaceId, meetingId } = params;
    const { title, description, duration } = await request.json();

    // Validate required fields
    if (!title || !duration) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Get the existing meeting
    const existingMeeting = await prisma.sessionMeeting.findFirst({
      where: {
        id: meetingId,
        workspaceId,
      },
    });

    if (!existingMeeting) {
      return NextResponse.json(
        { error: "Session meeting not found" },
        { status: 404 }
      );
    }

    // Get fresh Google tokens
    let tokens;
    let calendarSynced = false;
    try {
      tokens = await getFreshGoogleTokens(session.user.email);
    } catch (error) {
      console.warn("Could not get Google tokens for calendar update:", error);
      // Continue with database update even if we can't update calendar
    }

    // Try to update Google Calendar event
    if (tokens && existingMeeting.googleEventId) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.NEXTAUTH_URL
        );

        oauth2Client.setCredentials({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // Calculate new start and end times
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + duration * 60000);

        // Update the Google Calendar event
        const updatedEvent = {
          summary: title,
          description:
            description || `Updated meeting for workspace: ${workspaceId}`,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: "UTC",
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: "UTC",
          },
        };

        console.log(
          `Updating Google Calendar event: ${existingMeeting.googleEventId}`
        );
        await calendar.events.update({
          calendarId: "primary",
          eventId: existingMeeting.googleEventId,
          requestBody: updatedEvent,
        });

        calendarSynced = true;
        console.log("Google Calendar event updated successfully");
      } catch (calendarError) {
        console.error("Error updating Google Calendar event:", calendarError);
        // Continue with database update even if calendar update fails
      }
    } else {
      console.log(
        "No Google Event ID found or no tokens available for calendar update"
      );
    }

    // Calculate new start and end times for database
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration * 60000);

    // Update the meeting in the database
    const updatedMeeting = await prisma.sessionMeeting.update({
      where: {
        id: meetingId,
      },
      data: {
        title,
        description:
          description || `Updated meeting for workspace: ${workspaceId}`,
        startTime,
        endTime,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Get the user for notification
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (user) {
      // Create a notification about the updated meeting
      await prisma.notification.create({
        data: {
          workspaceId,
          userId: user.id,
          type: "MEETING_UPDATE",
          message: `${user.name} updated session meeting: ${title}`,
        },
      });
    }

    return NextResponse.json({
      ...updatedMeeting,
      calendarSynced,
    });
  } catch (error) {
    console.error("Error updating session meeting:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("Invalid Credentials") ||
        error.message.includes("invalid_token")
      ) {
        return NextResponse.json(
          {
            error:
              "Google authentication failed. Please sign out and sign in again with Google.",
            authRequired: true,
          },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update session meeting",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a session meeting
export async function DELETE(
  request: NextRequest,
  { params }: { params: { workspaceId: string; meetingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to delete meetings" },
        { status: 401 }
      );
    }

    const { workspaceId, meetingId } = params;

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

    // Get the existing meeting
    const existingMeeting = await prisma.sessionMeeting.findFirst({
      where: {
        id: meetingId,
        workspaceId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!existingMeeting) {
      return NextResponse.json(
        { error: "Session meeting not found" },
        { status: 404 }
      );
    }

    // Get fresh Google tokens
    let tokens;
    let calendarSynced = false;

    try {
      tokens = await getFreshGoogleTokens(session.user.email);
    } catch (error) {
      console.warn("Could not get Google tokens for calendar deletion:", error);
      // Continue with database deletion even if we can't delete from calendar
    }

    // Try to delete from Google Calendar
    if (tokens && existingMeeting.googleEventId) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.NEXTAUTH_URL
        );

        oauth2Client.setCredentials({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        console.log(
          `Deleting Google Calendar event: ${existingMeeting.googleEventId}`
        );
        await calendar.events.delete({
          calendarId: "primary",
          eventId: existingMeeting.googleEventId,
        });

        calendarSynced = true;
        console.log("Google Calendar event deleted successfully");
      } catch (calendarError) {
        console.error("Error deleting Google Calendar event:", calendarError);
        // Continue with database deletion even if calendar deletion fails
      }
    } else {
      console.log(
        "No Google Event ID found or no tokens available for calendar deletion"
      );
    }

    // Delete the meeting from the database
    await prisma.sessionMeeting.delete({
      where: {
        id: meetingId,
      },
    });

    // Get the user for notification
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (user) {
      // Create a notification about the deleted meeting
      await prisma.notification.create({
        data: {
          workspaceId,
          userId: user.id,
          type: "MEETING_DELETE",
          message: `${user.name} deleted session meeting: ${existingMeeting.title}`,
        },
      });
    }

    return NextResponse.json({
      message: "Session meeting deleted successfully",
      deletedMeeting: existingMeeting,
      calendarSynced,
    });
  } catch (error) {
    console.error("Error deleting session meeting:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete session meeting",
      },
      { status: 500 }
    );
  }
}
