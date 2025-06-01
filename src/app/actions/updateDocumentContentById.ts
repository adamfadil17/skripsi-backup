import prisma from "@/lib/prismadb";
import { User } from "@prisma/client";
import { pusherServer } from "@/lib/pusher";

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

    const safeContent = content ?? {};

    const existingContent = await prisma.documentContent.findFirst({
      where: { documentId },
    });

    let updatedContent;
    if (existingContent) {
      updatedContent = await prisma.documentContent.update({
        where: { id: existingContent.id },
        data: {
          content: safeContent,
          editedAt: new Date(),
          editedById: user.id,
        },
      });
    } else {
      updatedContent = await prisma.documentContent.create({
        data: {
          documentId,
          content: safeContent,
          editedAt: new Date(),
          editedById: user.id,
        },
      });
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        updatedById: user.id,
        updatedAt: new Date(),
      },
    });

    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      "document-content-updated",
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

async function handleDelayedNotification(
  workspaceId: string,
  documentId: string,
  documentTitle: string,
  currentUser: User,
  content: any,
  editorEmail: string
) {
  const existingTimeout = notificationTimeouts.get(documentId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const timeout = setTimeout(async () => {
    try {
      await prisma.notification.create({
        data: {
          workspaceId,
          message: `${currentUser.name} updated content of "${documentTitle}"`,
          type: "DOCUMENT_CONTENT_UPDATE",
          userId: currentUser.id,
          documentId,
        },
      });

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

      notificationTimeouts.delete(documentId);

      console.log(
        `Delayed notification sent for document: ${documentId} after 3 minutes`
      );
    } catch (error) {
      console.error("Error sending delayed notification:", error);
      notificationTimeouts.delete(documentId);
    }
  }, 180000);
  notificationTimeouts.set(documentId, timeout);
}
