import { google } from 'googleapis';
import prisma from '@/lib/prismadb';

export async function getGoogleCalendarClient(userId: string) {
  try {
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: 'google',
      },
    });

    if (!account || !account.access_token) {
      return null;
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    // Set credentials
    oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
    });

    // Check if token is expired and refresh if needed
    if (account.expires_at && account.expires_at * 1000 < Date.now()) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();

        // Update the token in the database
        await prisma.account.update({
          where: { id: account.id },
          data: {
            access_token: credentials.access_token,
            expires_at: credentials.expiry_date
              ? Math.floor(credentials.expiry_date / 1000)
              : undefined,
            refresh_token: credentials.refresh_token || account.refresh_token,
          },
        });

        oauth2Client.setCredentials(credentials);
      } catch (error) {
        console.error('Error refreshing access token:', error);
        return null;
      }
    }

    return google.calendar({ version: 'v3', auth: oauth2Client });
  } catch (error) {
    console.error('Error getting Google Calendar client:', error);
    return null;
  }
}

export async function createGoogleCalendarEvent(
  userId: string,
  meetingId: string,
  title: string,
  description: string | null,
  startDateTime: Date,
  endDateTime: Date,
  attendees: { email: string }[]
) {
  try {
    const calendar = await getGoogleCalendarClient(userId);
    if (!calendar) {
      return null;
    }

    const event = {
      summary: title,
      description: description || '',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: meetingId,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
    });

    return {
      googleCalendarId: 'primary',
      googleEventId: response.data.id,
      meetingLink: response.data.hangoutLink,
    };
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    return null;
  }
}

export async function updateGoogleCalendarEvent(
  userId: string,
  googleCalendarId: string,
  googleEventId: string,
  title: string,
  description: string | null,
  startDateTime: Date,
  endDateTime: Date,
  attendees: { email: string }[]
) {
  try {
    const calendar = await getGoogleCalendarClient(userId);
    if (!calendar) {
      return false;
    }

    const event = {
      summary: title,
      description: description || '',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees,
    };

    await calendar.events.update({
      calendarId: googleCalendarId,
      eventId: googleEventId,
      requestBody: event,
      sendUpdates: 'all',
    });

    return true;
  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
    return false;
  }
}

export async function deleteGoogleCalendarEvent(
  userId: string,
  googleCalendarId: string,
  googleEventId: string
) {
  try {
    const calendar = await getGoogleCalendarClient(userId);
    if (!calendar) {
      return false;
    }

    await calendar.events.delete({
      calendarId: googleCalendarId,
      eventId: googleEventId,
      sendUpdates: 'all',
    });

    return true;
  } catch (error) {
    console.error('Error deleting Google Calendar event:', error);
    return false;
  }
}

export async function listGoogleCalendarEvents(
  userId: string,
  timeMin?: Date,
  timeMax?: Date
) {
  try {
    const calendar = await getGoogleCalendarClient(userId);
    if (!calendar) {
      return null;
    }

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin ? timeMin.toISOString() : undefined,
      timeMax: timeMax ? timeMax.toISOString() : undefined,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items;
  } catch (error) {
    console.error('Error listing Google Calendar events:', error);
    return null;
  }
}
