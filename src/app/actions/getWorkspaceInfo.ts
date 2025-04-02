import prisma from '@/lib/prismadb';
import { WorkspaceInfo } from '@/types/types';
import { User } from '@prisma/client';

export async function getWorkspaceInfo(
  workspaceId: string,
  currentUser: User
): Promise<WorkspaceInfo | null> {
  try {
    if (!currentUser.id || !currentUser.email) {
      throw new Error('User not authenticated');
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        emoji: true,
        coverImage: true,
        members: {
          select: {
            id: true,
            role: true,
            userId: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        documents: {
          select: {
            id: true,
            title: true,
            emoji: true,
            coverImage: true,
            createdAt: true,
            createdBy: {
              select: { id: true, name: true, email: true },
            },
            updatedBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        chat: {
          select: {
            id: true,
            messages: {
              select: {
                id: true,
                body: true,
                createdAt: true,
                sender: {
                  select: { id: true, name: true, email: true },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        notifications: {
          select: {
            id: true,
            message: true,
            type: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        invitations: {
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
        },
      },
    });

    if (!workspace) return null;

    // ✅ Jika `currentUserId` ada, cek apakah user adalah member
    if (currentUser.id) {
      const isMember = workspace.members.some(
        (member) => member.userId === currentUser.id
      );
      if (!isMember) return null; // Kembalikan null jika bukan member
    }

    return workspace;
  } catch (error) {
    console.error('Error fetching workspace info:', error);
    throw {
      error_type: 'InternalServerError',
      message: 'An unexpected error occurred. Please try again later.',
    };
  }
}
