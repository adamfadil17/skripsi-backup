// app/actions/updateDocumentContent.ts
import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';

export async function updateDocumentContentById(
  workspaceId: string,
  documentId: string,
  content: any,
  editorEmail: string,
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

    if (!content) {
      throw {
        error_type: 'BadRequest',
        message: 'Content is required',
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

    // Get document details for notification
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { title: true },
    });

    if (!document) {
      throw {
        error_type: 'NotFound',
        message: 'Document not found',
      };
    }

    // Find the user by email to get their ID for the database
    const user = await prisma.user.findUnique({
      where: { email: currentUser.email },
      select: { id: true },
    });

    if (!user) {
      throw {
        error_type: 'NotFound',
        message: 'User not found',
      };
    }

    const safeContent = content ?? {}; // Ensure content is not null/undefined

    // Check if document content already exists in database
    const existingContent = await prisma.documentContent.findFirst({
      where: { documentId },
    });

    let updatedContent;
    if (existingContent) {
      // If it exists, update it
      updatedContent = await prisma.documentContent.update({
        where: { id: existingContent.id },
        data: {
          content: safeContent,
          editedAt: new Date(),
          editedById: user.id,
        },
      });
    } else {
      // If it doesn't exist, create a new entry
      updatedContent = await prisma.documentContent.create({
        data: {
          documentId,
          content: safeContent,
          editedAt: new Date(),
          editedById: user.id,
        },
      });
    }

    // Update the document's updatedBy field
    await prisma.document.update({
      where: { id: documentId },
      data: {
        updatedById: user.id,
        updatedAt: new Date(),
      },
    });

    // Create notification for document content update
    await prisma.notification.create({
      data: {
        workspaceId,
        message: `${currentUser.name} updated content of "${document.title}"`,
        type: 'DOCUMENT_CONTENT_UPDATE',
        userId: currentUser.id,
        documentId,
      },
    });

    // Trigger Pusher events for real-time updates
    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      'document-content-updated',
      {
        documentId,
        content: safeContent,
        editorEmail, // Include the editor's email to prevent update loops
        timestamp: new Date().toISOString(),
        documentName: document?.title,
        editedBy: {
          id: currentUser.id,
          name: currentUser.name,
          image: currentUser.image,
        },
      }
    );

    await pusherServer.trigger(
      `notification-${workspaceId}`,
      'document-content-updated',
      {
        documentId,
        content: safeContent,
        editorEmail,
        timestamp: new Date().toISOString(),
        documentName: document?.title,
        editedBy: {
          id: currentUser.id,
          name: currentUser.name,
          image: currentUser.image,
        },
      }
    );

    return {
      updatedContent,
    };
  } catch (error) {
    console.error('Error updating document content:', error);
    throw error;
  }
}
