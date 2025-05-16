import prisma from '@/lib/prismadb';
import { WorkspaceInfo } from '@/types/types';
import { User } from '@prisma/client';

export async function getWorkspaceById(
  workspaceId: string,
  currentUser: User
): Promise<WorkspaceInfo | null> {
  try {
    if (!currentUser.id || !currentUser.email) {
      throw new Error('User not authenticated');
    }

    const isMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: currentUser.id,
          workspaceId,
        },
      },
    });

    if (!isMember) {
      return null;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        emoji: true,
        coverImage: true,
      },
    });

    if (!workspace) return null;

    return workspace;
  } catch (error) {
    console.error('Error fetching workspace info:', error);
    throw {
      error_type: 'InternalServerError',
      message: 'An unexpected error occurred. Please try again later.',
    };
  }
}
