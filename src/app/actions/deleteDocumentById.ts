import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';

export async function deleteDocumentById(
  workspaceId: string,
  documentId: string,
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

    const document = await prisma.document.findUnique({
      where: { id: documentId, workspaceId: workspaceId },
      include: { workspace: true },
    });

    if (!document) {
      throw {
        error_type: 'NotFound',
        message: 'Document not found',
      };
    }

    const documentTitle = document.title;

    const [deletedDocument] = await prisma.$transaction([
      prisma.document.delete({ where: { id: documentId } }),
      prisma.notification.create({
        data: {
          workspaceId,
          userId: currentUser.id,
          type: 'DOCUMENT_DELETE',
          message: `${currentUser.name} deleted document "${documentTitle}"`,
        },
      }),
    ]);

    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      'document-removed',
      documentId
    );

    await pusherServer.trigger(
      `notification-${workspaceId}`,
      'document-removed',
      {
        id: documentId,
        title: documentTitle,
        deletedBy: {
          id: currentUser.id,
          name: currentUser.name,
          image: currentUser.image || null,
        },
      }
    );

    return deletedDocument;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}
