// lib/createWorkspace.ts
import prisma from '@/lib/prismadb';
import { User, Workspace } from '@prisma/client';

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

    // Create new workspace with document, chat, and member
    const newWorkspace = await prisma.workspace.create({
      data: {
        name,
        emoji,
        coverImage,
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
