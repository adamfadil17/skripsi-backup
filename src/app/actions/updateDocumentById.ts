import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';

interface UpdateDocumentData {
  title?: string;
  emoji?: string;
  coverImage?: string;
}

export async function updateDocumentById(
  workspaceId: string,
  documentId: string,
  updateData: UpdateDocumentData,
  currentUser: User
) {
  try {
    if (!currentUser?.id || !currentUser?.email) {
      throw {
        error_type: 'Unauthorized',
        message: 'Unauthorized access',
      };
    }

    if (!workspaceId || !documentId) {
      throw {
        error_type: 'BadRequest',
        message: 'workspaceId and documentId are required',
      };
    }

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

    const { title, emoji, coverImage } = updateData;

    const document = await prisma.document.findUnique({
      where: { id: documentId, workspaceId: workspaceId },
    });

    if (!document) {
      throw {
        error_type: 'NotFound',
        message: 'Document not found',
      };
    }

    const documentUpdateData: any = {};
    if (title !== undefined) documentUpdateData.title = title;
    if (emoji !== undefined) documentUpdateData.emoji = emoji;
    if (coverImage !== undefined) documentUpdateData.coverImage = coverImage;

    // Add updatedById if there's any update to be made
    if (Object.keys(documentUpdateData).length > 0) {
      documentUpdateData.updatedById = currentUser.id;
    }

    const hasChanges =
      (title !== undefined && title !== document.title) ||
      (emoji !== undefined && emoji !== document.emoji) ||
      (coverImage !== undefined && coverImage !== document.coverImage);

    if (Object.keys(documentUpdateData).length === 0) {
      return {
        noChanges: true,
        document,
      };
    }

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: documentUpdateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (hasChanges) {
    await prisma.notification.create({
        data: {
          workspaceId,
          message: `${currentUser.name} updated document information of "${updatedDocument.title}"`,
          type: 'DOCUMENT_UPDATE',
          userId: currentUser.id,
          documentId: documentId,
        },
      });

      await pusherServer.trigger(
        `workspace-${workspaceId}`,
        'document-updated',
        {
          id: updatedDocument.id,
          title: updatedDocument.title,
          emoji: updatedDocument.emoji,
          coverImage: updatedDocument.coverImage,
          createdAt: updatedDocument.createdAt,
          createdBy: updatedDocument.createdBy,
          updatedBy: updatedDocument.updatedBy,
        }
      );

      await pusherServer.trigger(
        `notification-${workspaceId}`,
        'document-updated',
        {
          id: updatedDocument.id,
          title: updatedDocument.title,
          emoji: updatedDocument.emoji,
          coverImage: updatedDocument.coverImage,
          updatedBy: {
            id: updatedDocument.updatedBy?.id,
            name: updatedDocument.updatedBy?.name,
            image: updatedDocument.updatedBy?.image,
          },
        }
      );
    }

    return {
      noChanges: false,
      updatedDocument,
    };
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
}
