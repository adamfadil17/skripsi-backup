import prisma from "@/lib/prismadb";
import { User } from "@prisma/client";

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
        error_type: "Unauthorized",
        message: "Unauthorized access",
      };
    }

    const { name, emoji, coverImage } = workspaceData;

    if (!name) {
      throw {
        error_type: "BadRequest",
        message: "Workspace name is required",
      };
    }

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
        error_type: "BadRequest",
        message: "Workspace name already exists",
      };
    }

    const newWorkspace = await prisma.workspace.create({
      data: {
        name,
        emoji,
        coverImage,
        googleMeetUrl: null,
        members: {
          create: {
            userId: currentUser.id,
            role: "SUPER_ADMIN",
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
            title: "Getting Started",
            emoji: "🚀",
            coverImage: "/images/cover.png",
            createdById: currentUser.id,
            documentContents: {
              create: {
                content: {
                  type: "doc",
                  content: [
                    {
                      type: "paragraph",
                    },
                  ],
                },
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
        documents: {
          include: {
            documentContents: true,
          },
        },
      },
    });

    return newWorkspace;
  } catch (error) {
    console.error("Error creating workspace:", error);
    throw error;
  }
}
