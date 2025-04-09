import prisma from '@/lib/prismadb';
import { WorkspaceMember } from '@/types/types';
import { User } from '@prisma/client';

export async function getWorkspaceMembers(
  workspaceId: string,
  currentUser: User
): Promise<WorkspaceMember[]> {
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

    // Ambil semua anggota di workspace langsung dari WorkspaceMember
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
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
    });

    // Jika tidak ada anggota, berarti workspace tidak ada atau kosong
    if (!members.length) return null;

    return members;
  } catch (error) {
    console.error('Error fetching workspace members:', error);
    throw {
      error_type: 'InternalServerError',
      message: 'An unexpected error occurred. Please try again later.',
    };
  }
}
