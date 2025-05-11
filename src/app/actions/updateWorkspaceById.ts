// lib/updateWorkspaceById.ts
import prisma from '@/lib/prismadb';
import { User, Workspace } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';

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
        error_type: 'Unauthorized',
        message: 'Unauthorized access',
      };
    }

    if (!workspaceId) {
      throw {
        error_type: 'BadRequest',
        message: 'Workspace ID is required',
      };
    }

    const { name, emoji, coverImage } = updateData;

    if (!name || !emoji || !coverImage) {
      throw {
        error_type: 'BadRequest',
        message: 'All fields are required',
      };
    }

    // Validate: Check if user is SUPER_ADMIN in this workspace
    const userWorkspace = await prisma.workspaceMember.findFirst({
      where: {
        userId: currentUser.id,
        workspaceId,
        role: 'SUPER_ADMIN',
      },
    });

    if (!userWorkspace) {
      throw {
        error_type: 'Forbidden',
        message: 'Forbidden: Only Owner can update workspace',
      };
    }

    // Get current workspace data before update
    const currentWorkspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!currentWorkspace) {
      throw {
        error_type: 'NotFound',
        message: 'Workspace not found',
      };
    }

    // Check if any data has changed
    const hasChanges =
      currentWorkspace.name !== name ||
      currentWorkspace.emoji !== emoji ||
      currentWorkspace.coverImage !== coverImage;

    // Update workspace
    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name, emoji, coverImage },
    });

    // Only create notification and trigger Pusher events if data has changed
    if (hasChanges) {
      // Create notification for workspace update
      await prisma.notification.create({
        data: {
          workspaceId,
          message: `${currentUser.name} updated workspace profile`,
          type: 'WORKSPACE_UPDATE',
          userId: currentUser.id,
        },
      });

      // Trigger Pusher event for real-time updates
      await pusherServer.trigger(
        `workspace-${workspaceId}`,
        'workspace-updated',
        updatedWorkspace
      );

      await pusherServer.trigger(
        `notification-${workspaceId}`,
        'workspace-updated',
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
    console.error('Error updating workspace:', error);
    throw error;
  }
}
