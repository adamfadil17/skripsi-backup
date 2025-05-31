// app/actions/updateDocumentContent.ts
import prisma from "@/lib/prismadb";
import { User } from "@prisma/client";
import { pusherServer } from "@/lib/pusher";

// Store untuk tracking timeout notifications per document
const notificationTimeouts = new Map<string, NodeJS.Timeout>();

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
        error_type: "Unauthorized",
        message: "Unauthorized access",
      };
    }

    if (!workspaceId || !documentId) {
      throw {
        error_type: "BadRequest",
        message: "workspaceId and documentId are required",
      };
    }

    if (!content) {
      throw {
        error_type: "BadRequest",
        message: "Content is required",
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
        error_type: "Forbidden",
        message: "You do not have access to this workspace",
      };
    }

    // Get document details for notification
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { title: true },
    });

    if (!document) {
      throw {
        error_type: "NotFound",
        message: "Document not found",
      };
    }

    // Find the user by email to get their ID for the database
    const user = await prisma.user.findUnique({
      where: { email: currentUser.email },
      select: { id: true },
    });

    if (!user) {
      throw {
        error_type: "NotFound",
        message: "User not found",
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

    // Trigger immediate Pusher event for real-time content updates
    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      "document-content-updated",
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

    // Handle delayed notification (3 minutes after last change)
    handleDelayedNotification(
      workspaceId,
      documentId,
      document.title,
      currentUser,
      safeContent,
      editorEmail
    );

    return {
      updatedContent,
    };
  } catch (error) {
    console.error("Error updating document content:", error);
    throw error;
  }
}

// Function to handle delayed notification with debouncing
async function handleDelayedNotification(
  workspaceId: string,
  documentId: string,
  documentTitle: string,
  currentUser: User,
  content: any,
  editorEmail: string
) {
  // Clear existing timeout for this document if it exists
  const existingTimeout = notificationTimeouts.get(documentId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Set new timeout for 3 minutes (180000 ms)
  const timeout = setTimeout(async () => {
    try {
      // Create notification for document content update
      await prisma.notification.create({
        data: {
          workspaceId,
          message: `${currentUser.name} updated content of "${documentTitle}"`,
          type: "DOCUMENT_CONTENT_UPDATE",
          userId: currentUser.id,
          documentId,
        },
      });

      // Send notification via Pusher
      await pusherServer.trigger(
        `notification-${workspaceId}`,
        "document-content-updated",
        {
          documentId,
          content,
          editorEmail,
          timestamp: new Date().toISOString(),
          documentName: documentTitle,
          editedBy: {
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.image,
          },
        }
      );

      // Remove timeout from map after execution
      notificationTimeouts.delete(documentId);

      console.log(
        `Delayed notification sent for document: ${documentId} after 3 minutes`
      );
    } catch (error) {
      console.error("Error sending delayed notification:", error);
      // Remove timeout from map even if there's an error
      notificationTimeouts.delete(documentId);
    }
  }, 180000); // 3 minutes = 180000 milliseconds

  // Store timeout reference
  notificationTimeouts.set(documentId, timeout);
}
