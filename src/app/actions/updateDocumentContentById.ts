import prisma from "@/lib/prismadb";
import { User } from "@prisma/client";
import { pusherServer } from "@/lib/pusher";

// Define TipTap content types
interface TipTapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  text?: string;
}

interface TipTapDocument {
  type: "doc";
  content?: TipTapNode[];
}

// Type guard to check if content is a valid TipTap document
function isTipTapDocument(content: any): content is TipTapDocument {
  return (
    content &&
    typeof content === "object" &&
    content.type === "doc" &&
    (content.content === undefined || Array.isArray(content.content))
  );
}

// Function to validate and sanitize TipTap content
function validateTipTapContent(content: any): TipTapDocument {
  if (!content || typeof content !== "object") {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }

  // Ensure it has the proper TipTap structure
  if (!isTipTapDocument(content)) {
    return {
      type: "doc",
      content: Array.isArray(content) ? content : [{ type: "paragraph" }],
    };
  }

  // Ensure content array exists
  if (!Array.isArray(content.content)) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }

  return content;
}

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

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        workspaceId, // Ensure document belongs to workspace
      },
      select: { title: true },
    });

    if (!document) {
      throw {
        error_type: "NotFound",
        message: "Document not found in this workspace",
      };
    }

    const user = await prisma.user.findUnique({
      where: { email: currentUser.email },
      select: { id: true, name: true, image: true },
    });

    if (!user) {
      throw {
        error_type: "NotFound",
        message: "User not found",
      };
    }

    // Validate and sanitize TipTap content
    const safeContent = validateTipTapContent(content);

    const existingContent = await prisma.documentContent.findFirst({
      where: { documentId },
    });

    let updatedContent;
    if (existingContent) {
      updatedContent = await prisma.documentContent.update({
        where: { id: existingContent.id },
        data: {
          content: safeContent as any, // Cast to any for Prisma Json type
          editedAt: new Date(),
          editedById: user.id,
        },
        include: {
          editedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });
    } else {
      updatedContent = await prisma.documentContent.create({
        data: {
          documentId,
          content: safeContent as any, // Cast to any for Prisma Json type
          editedAt: new Date(),
          editedById: user.id,
        },
        include: {
          editedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });
    }

    // Update document's updatedAt timestamp
    await prisma.document.update({
      where: { id: documentId },
      data: {
        updatedById: user.id,
        updatedAt: new Date(),
      },
    });

    // Send real-time update via Pusher
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
          email: currentUser.email,
          image: currentUser.image,
        },
      }
    );

    // Handle delayed notification (after 3 minutes of inactivity)
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
      content: safeContent,
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
  content: TipTapDocument,
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
  }, 180000); // 3 minutes

  notificationTimeouts.set(documentId, timeout);
}
