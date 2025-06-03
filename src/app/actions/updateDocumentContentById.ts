import prisma from "@/lib/prismadb";
import type { User } from "@prisma/client";
import { pusherServer } from "@/lib/pusher";

// In-memory version tracking since we don't have it in the database
const documentVersions = new Map<string, number>();
const documentLastEdited = new Map<string, Date>();
const notificationTimeouts = new Map<string, NodeJS.Timeout>();

interface UpdateOptions {
  timestamp?: number;
  skipBroadcast?: boolean;
}

export async function updateDocumentContentById(
  workspaceId: string,
  documentId: string,
  content: any,
  editorEmail: string,
  currentUser: User,
  options: UpdateOptions = {}
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
    const currentTime = new Date();

    // Enhanced conflict detection using in-memory tracking
    const existingContent = await prisma.documentContent.findFirst({
      where: { documentId },
      orderBy: { editedAt: "desc" },
    });

    // Check for conflicts using timestamps
    const lastEditTime = documentLastEdited.get(documentId);
    if (lastEditTime && options.timestamp) {
      const clientEditTime = new Date(options.timestamp);

      // If client's edit is based on an older version than what's on the server
      if (clientEditTime < lastEditTime) {
        // Conflict detected - client is behind
        throw {
          error_type: "Conflict",
          message: "Document was modified by another user",
          serverContent: existingContent?.content,
          conflicts: [
            {
              type: "timestamp_conflict",
              clientTimestamp: clientEditTime.toISOString(),
              serverTimestamp: lastEditTime.toISOString(),
            },
          ],
        };
      }
    }

    // Update in-memory version tracking
    const currentVersion = documentVersions.get(documentId) || 0;
    const newVersion = currentVersion + 1;
    documentVersions.set(documentId, newVersion);
    documentLastEdited.set(documentId, currentTime);

    let updatedContent;
    if (existingContent) {
      updatedContent = await prisma.documentContent.update({
        where: { id: existingContent.id },
        data: {
          content: safeContent,
          editedAt: currentTime,
          editedById: user.id,
        },
      });
    } else {
      updatedContent = await prisma.documentContent.create({
        data: {
          documentId,
          content: safeContent,
          editedAt: currentTime,
          editedById: user.id,
        },
      });
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        updatedById: user.id,
        updatedAt: currentTime,
      },
    });

    // Enhanced Pusher broadcast with metadata
    if (!options.skipBroadcast) {
      await pusherServer.trigger(
        `workspace-${workspaceId}`,
        "document-content-updated",
        {
          documentId,
          content: safeContent,
          editorEmail,
          timestamp: currentTime.toISOString(),
          documentName: document?.title,
          version: newVersion, // Virtual version for conflict resolution
          editedBy: {
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.image,
          },
          operation: determineOperation(existingContent?.content, safeContent),
        }
      );
    }

    handleDelayedNotification(
      workspaceId,
      documentId,
      document.title,
      currentUser,
      safeContent,
      editorEmail,
      newVersion
    );

    return {
      updatedContent,
      version: newVersion,
      conflicts: [],
    };
  } catch (error) {
    console.error("Error updating document content:", error);
    throw error;
  }
}

// Determine the type of operation performed
function determineOperation(
  oldContent: any,
  newContent: any
): "insert" | "delete" | "modify" {
  if (!oldContent || !oldContent.blocks) return "insert";
  if (!newContent || !newContent.blocks) return "delete";

  const oldBlockCount = oldContent.blocks.length;
  const newBlockCount = newContent.blocks.length;

  if (newBlockCount > oldBlockCount) return "insert";
  if (newBlockCount < oldBlockCount) return "delete";
  return "modify";
}

async function handleDelayedNotification(
  workspaceId: string,
  documentId: string,
  documentTitle: string,
  currentUser: User,
  content: any,
  editorEmail: string,
  version: number
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
          version,
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
