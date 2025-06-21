import prisma from "@/lib/prismadb";
import { User } from "@prisma/client";

export async function getDocumentContentById(
  documentId: string,
  currentUser: User,
  workspaceId: string
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

    // Get document content
    const documentContent = await prisma.documentContent.findFirst({
      where: {
        documentId,
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
      orderBy: {
        editedAt: "desc",
      },
    });

    // Return the content or null if not found
    return documentContent;
  } catch (error: any) {
    console.error("Error fetching document content by ID:", error);

    // Re-throw structured errors
    if (error.error_type) {
      throw error;
    }

    // Handle unexpected errors
    throw {
      error_type: "InternalServerError",
      message: "Failed to fetch document content",
    };
  }
}
