// app/actions/createDocument.ts
import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';

interface DocumentInput {
  title: string;
  emoji: string;
  coverImage: string;
}

export async function createDocument(
  workspaceId: string,
  documentData: DocumentInput,
  currentUser: User
) {
  try {
    if (!currentUser?.id || !currentUser?.email) {
      throw {
        error_type: 'Unauthorized',
        message: 'Unauthorized access',
      };
    }

    if (!workspaceId) {
      throw {
        error_type: 'BadRequest',
        message: 'Workspace ID is required',
      };
    }

    const { title, emoji, coverImage } = documentData;

    if (!title || !emoji || !coverImage) {
      throw {
        error_type: 'BadRequest',
        message: 'All fields are required',
      };
    }

    // Check if user is a member of the workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: currentUser.id,
      },
    });

    if (!membership) {
      throw {
        error_type: 'Forbidden',
        message: 'You do not have access to this workspace',
      };
    }

    const newDocument = await prisma.document.create({
      data: {
        title: title || 'Untitled Document',
        emoji: emoji || '📝',
        coverImage: coverImage || '/images/cover.png',
        createdById: currentUser.id,
        workspaceId,

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
            editedById: currentUser.id,
          },
        },
      },
      include: {
        documentContents: true,
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

    // Create notification for document creation
    await prisma.notification.create({
      data: {
        workspaceId,
        message: `${currentUser.name} created document "${newDocument.title}"`,
        type: 'DOCUMENT_CREATE',
        userId: currentUser.id,
        documentId: newDocument.id,
      },
    });

    // Trigger Pusher event for real-time updates
    await pusherServer.trigger(`workspace-${workspaceId}`, 'document-added', {
      id: newDocument.id,
      title: newDocument.title,
      emoji: newDocument.emoji,
      coverImage: newDocument.coverImage,
      createdAt: newDocument.createdAt,
      createdBy: newDocument.createdBy,
    });

    await pusherServer.trigger(
      `notification-${workspaceId}`,
      'document-added',
      {
        id: newDocument.id,
        title: newDocument.title,
        emoji: newDocument.emoji,
        coverImage: newDocument.coverImage,
        createdBy: {
          id: newDocument.createdBy?.id,
          name: newDocument.createdBy?.name,
          image: newDocument.createdBy?.image,
        },
      }
    );

    return newDocument;
  } catch (error) {
    console.error('Error creating document:', error);
    throw error;
  }
}
