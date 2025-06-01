import prisma from "@/lib/prismadb";
import { User, Workspace } from "@prisma/client";
import { pusherServer } from "@/lib/pusher";

interface UpdateWorkspaceInput {
  name: string;
  emoji: string;
  coverImage: string;
}

export async function updateWorkspaceById(
  workspaceId: string,
  updateData: UpdateWorkspaceInput,
  currentUser: User
) {
  try {
    if (!currentUser.id || !currentUser.email) {
      throw {
        error_type: "Unauthorized",
        message: "Unauthorized access",
      };
    }

    if (!workspaceId) {
      throw {
        error_type: "BadRequest",
        message: "Workspace ID is required",
      };
    }

    const { name, emoji, coverImage } = updateData;

    if (!name || !emoji || !coverImage) {
      throw {
        error_type: "BadRequest",
        message: "All fields are required",
      };
    }

    const userWorkspace = await prisma.workspaceMember.findFirst({
      where: {
        userId: currentUser.id,
        workspaceId,
        role: "SUPER_ADMIN",
      },
    });

    if (!userWorkspace) {
      throw {
        error_type: "Forbidden",
        message: "Forbidden: Only Owner can update workspace",
      };
    }

    const currentWorkspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!currentWorkspace) {
      throw {
        error_type: "NotFound",
        message: "Workspace not found",
      };
    }

    const hasChanges =
      currentWorkspace.name !== name ||
      currentWorkspace.emoji !== emoji ||
      currentWorkspace.coverImage !== coverImage;

    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name, emoji, coverImage },
    });

    if (hasChanges) {
      await prisma.notification.create({
        data: {
          workspaceId,
          message: `${currentUser.name} updated workspace profile`,
          type: "WORKSPACE_UPDATE",
          userId: currentUser.id,
        },
      });

      await pusherServer.trigger(
        `workspace-${workspaceId}`,
        "workspace-updated",
        updatedWorkspace
      );

      await pusherServer.trigger(
        `notification-${workspaceId}`,
        "workspace-updated",
        {
          ...updatedWorkspace,
          updatedBy: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            image: currentUser.image,
          },
        }
      );
    }

    return updatedWorkspace;
  } catch (error) {
    console.error("Error updating workspace:", error);
    throw error;
  }
}
