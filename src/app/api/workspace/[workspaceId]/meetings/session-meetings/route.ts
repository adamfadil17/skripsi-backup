import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prismadb";
import { google } from "googleapis";
import { getFreshGoogleTokens } from "@/lib/auth-helpers";
import { authOptions } from "@/lib/auth-options";

// GET - Fetch all session meetings for a workspace
export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to access session meetings" },
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
    });

    if (!workspaceMember) {
      return NextResponse.json(
        { error: "You don't have access to this workspace" },
        { status: 403 }
      );
    }

    // Fetch all session meetings for this workspace
    const sessionMeetings = await prisma.sessionMeeting.findMany({
      where: {
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(sessionMeetings);
  } catch (error) {
    console.error("Error fetching session meetings:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch session meetings",
      },
      { status: 500 }
    );
  }
}

// POST - Create a new session meeting with Google Meet integration
export async function POST(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to create meetings" },
        { status: 401 }
      );
    }

    const { workspaceId } = params;
    const { title, description, duration, organizerEmail } =
      await request.json();

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

    // Get fresh Google tokens using our helper function
    let tokens;
    try {
      tokens = await getFreshGoogleTokens(session.user.email);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            "Failed to get valid Google credentials. Please sign in again with Google.",
          authRequired: true,
        },
        { status: 401 }
      );
    }

    // Set up OAuth2 client with fresh tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL
    );

    // Set credentials
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Calculate start and end times
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration * 60000);

    // Create calendar event with Google Meet
    const event = {
      summary: title,
      description: description || `Meeting for workspace: ${workspaceId}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "UTC",
      },
      attendees: [{ email: organizerEmail }],
      conferenceData: {
        createRequest: {
          requestId: `meet-${workspaceId}-${Date.now()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      conferenceDataVersion: 1,
    });

    const meetLink = response.data.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video"
    )?.uri;

    if (!meetLink) {
      throw new Error("Failed to generate Google Meet link");
    }

    // Get the user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Save the meeting to the SessionMeeting model with Google Event ID
    const sessionMeeting = await prisma.sessionMeeting.create({
      data: {
        title,
        description: description || `Meeting for workspace: ${workspaceId}`,
        meetLink,
        googleEventId: response.data.id, // Store the Google Calendar event ID
        startTime: startTime,
        endTime: endTime,
        workspaceId,
        createdById: user.id,
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

    // Create a notification about the new meeting
    await prisma.notification.create({
      data: {
        workspaceId,
        userId: user.id,
        type: "MEETING_CREATE",
        message: `${user.name} created new session meeting: ${title}`,
      },
    });

    return NextResponse.json({
      ...sessionMeeting,
      eventId: response.data.id,
      isPermanent: false,
    });
  } catch (error) {
    console.error("Error creating session meeting:", error);

    // Provide more specific error messages
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
      if (error.message.includes("insufficient permissions")) {
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
            : "Failed to create session meeting",
      },
      { status: 500 }
    );
  }
}
