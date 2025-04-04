import prisma from '@/lib/prismadb';
import { WorkspaceInvitation } from '@/types/types';
import type { User } from '@prisma/client';

export async function getWorkspaceInvitations(
  workspaceId: string,
  currentUser: User
): Promise<WorkspaceInvitation[] | null> {
  try {
    if (!currentUser.id || !currentUser.email) {
      throw new Error('User not authenticated');
    }

    // First check if the user is a member of the workspace
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

    // Fetch invitations for the workspace
    const invitations = await prisma.invitation.findMany({
      where: { workspaceId },
      select: {
        id: true,
        email: true,
        role: true,
        invitedAt: true,
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { invitedAt: 'desc' },
    });

    return invitations;
  } catch (error) {
    console.error('Error fetching workspace invitations:', error);
    throw {
      error_type: 'InternalServerError',
      message: 'An unexpected error occurred. Please try again later.',
    };
  }
}
