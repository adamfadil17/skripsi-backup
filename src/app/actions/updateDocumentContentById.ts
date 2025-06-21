import prisma from "@/lib/prismadb";
import { User } from "@prisma/client";

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

// Simple notification timeout tracking without external dependencies
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

    // Check if user has access to the workspace
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

    // Check if document exists and belongs to the workspace
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        workspaceId, // Ensure document belongs to workspace
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!document) {
      throw {
        error_type: "NotFound",
        message: "Document not found in this workspace",
      };
    }

    // Get user data
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

    // Check if document content already exists
    const existingContent = await prisma.documentContent.findFirst({
      where: { documentId },
    });

    let updatedContent;
    if (existingContent) {
      // Update existing content
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
      // Create new content
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

    // Update document's updatedAt timestamp and updatedBy
    await prisma.document.update({
      where: { id: documentId },
      data: {
        updatedById: user.id,
        updatedAt: new Date(),
      },
    });

    // Handle delayed notification (after 3 minutes of inactivity)
    // This creates a database notification without real-time updates
    handleDelayedNotification(
      workspaceId,
      documentId,
      document.title,
      currentUser,
      safeContent
    );

    return {
      updatedContent,
      content: safeContent,
    };
  } catch (error: any) {
    console.error("Error updating document content:", error);

    // Re-throw structured errors
    if (error.error_type) {
      throw error;
    }

    // Handle unexpected errors
    throw {
      error_type: "InternalServerError",
      message: "Failed to update document content",
    };
  }
}

async function handleDelayedNotification(
  workspaceId: string,
  documentId: string,
  documentTitle: string,
  currentUser: User,
  content: TipTapDocument
) {
  // Clear existing timeout for this document
  const existingTimeout = notificationTimeouts.get(documentId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Set new timeout for delayed notification
  const timeout = setTimeout(async () => {
    try {
      // Create notification in database
      await prisma.notification.create({
        data: {
          workspaceId,
          message: `${currentUser.name} updated content of "${documentTitle}"`,
          type: "DOCUMENT_CONTENT_UPDATE",
          userId: currentUser.id,
          documentId,
        },
      });

      // Remove timeout from map
      notificationTimeouts.delete(documentId);

      console.log(
        `Delayed notification created for document: ${documentId} after 3 minutes`
      );
    } catch (error) {
      console.error("Error creating delayed notification:", error);
      notificationTimeouts.delete(documentId);
    }
  }, 180000); // 3 minutes

  // Store timeout reference
  notificationTimeouts.set(documentId, timeout);
}
