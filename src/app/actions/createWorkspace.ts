// lib/createWorkspace.ts
import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';
import { google } from 'googleapis';

interface CreateWorkspaceInput {
  name: string;
  emoji?: string;
  coverImage?: string;
}

export async function createWorkspace(
  workspaceData: CreateWorkspaceInput,
  currentUser: User
) {
  try {
    if (!currentUser.id || !currentUser.email) {
      throw {
        error_type: 'Unauthorized',
        message: 'Unauthorized access',
      };
    }

    const { name, emoji, coverImage } = workspaceData;

    if (!name) {
      throw {
        error_type: 'BadRequest',
        message: 'Workspace name is required',
      };
    }

    // Check if a workspace with the same name already exists for this user
    const existingWorkspace = await prisma.workspace.findFirst({
      where: {
        name,
        members: {
          some: {
            userId: currentUser.id,
          },
        },
      },
    });

    if (existingWorkspace) {
      throw {
        error_type: 'BadRequest',
        message: 'Workspace name already exists',
      };
    }

    // Generate a Google Meet link for the workspace
    let googleMeetUrl = null;
    try {
      googleMeetUrl = await generateGoogleMeetLink(name, currentUser.email);
    } catch (error) {
      console.error('Error generating Google Meet link:', error);
      // Continue without Google Meet link if generation fails
    }

    // Create new workspace with document, chat, and member
    const newWorkspace = await prisma.workspace.create({
      data: {
        name,
        emoji,
        coverImage,
        googleMeetUrl: googleMeetUrl,
        members: {
          create: {
            userId: currentUser.id,
            role: 'SUPER_ADMIN',
          },
        },
        conversation: {
          create: {
            messages: {
              create: {
                body: `Welcome to the ${name} workspace! Start collaborating here.`,
                senderId: currentUser.id,
                seenIds: [currentUser.id],
                seenBy: {
                  connect: {
                    id: currentUser.id,
                  },
                },
              },
            },
          },
        },
        documents: {
          create: {
            // Default document with title 'Untitled Document'
            title: 'Untitled Document',
            emoji: '📝',
            coverImage: '/images/cover.png',
            // Mark who created the document
            createdById: currentUser.id,
            // Since it's a new document, updatedBy can be null
            documentContents: {
              create: {
                content: {
                  time: Date.now(),
                  blocks: [
                    {
                      type: 'paragraph',
                      data: {
                        text: 'Welcome to your new workspace! Start collaborating here.',
                      },
                    },
                  ],
                  version: '2.30.8',
                },
                // Use currentUser as initial editor
                editedById: currentUser.id,
              },
            },
          },
        },
      },
      include: {
        members: true,
        conversation: {
          include: {
            messages: {
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },
                seenBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        documents: true,
      },
    });

    return newWorkspace;
  } catch (error) {
    console.error('Error creating workspace:', error);
    throw error;
  }
}

async function generateGoogleMeetLink(
  workspaceName: string,
  userEmail: string
): Promise<string | null> {
  try {
    // Get user account with Google access
    const userAccount = await prisma.account.findFirst({
      where: {
        user: {
          email: userEmail,
        },
        provider: 'google',
      },
      select: {
        access_token: true,
      },
    });

    if (!userAccount?.access_token) {
      console.error('No Google account found for user');
      return null;
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL
    );

    // Use the access token from the user's Google account
    oauth2Client.setCredentials({
      access_token: userAccount.access_token,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Create a permanent meeting
    const event = {
      summary: `${workspaceName} Permanent Meeting Room`,
      description: `Permanent meeting room for ${workspaceName} workspace`,
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
          requestId: `workspace-${workspaceName}-${Date.now()}`,
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

    return meetLink || null;
  } catch (error) {
    console.error('Error generating Google Meet link:', error);
    return null;
  }
}
