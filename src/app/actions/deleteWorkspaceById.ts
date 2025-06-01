import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';

export async function deleteWorkspaceById(
  workspaceId: string,
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

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });

    if (!workspace) {
      throw {
        error_type: 'NotFound',
        message: 'Workspace not found',
      };
    }

    const isOwner = workspace.members.some(
      (member) =>
        member.userId === currentUser.id && member.role === 'SUPER_ADMIN'
    );

    if (!isOwner) {
      throw {
        error_type: 'Forbidden',
        message: 'Forbidden: Only Owner can delete workspace',
      };
    }

    const deletedWorkspace = await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      'workspace-deleted',
      workspaceId
    );

    return deletedWorkspace;
  } catch (error) {
    console.error('Error deleting workspace:', error);
    throw error;
  }
}
