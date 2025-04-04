import prisma from '@/lib/prismadb';
import { WorkspaceMember } from '@/types/types';
import { User } from '@prisma/client';

export async function getWorkspaceMembers(
  workspaceId: string,
  currentUser: User
): Promise<WorkspaceMember[] | null> {
  try {
    if (!currentUser.id || !currentUser.email) {
      throw new Error('User not authenticated');
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

    // Pastikan currentUser adalah anggota workspace
    const isMember = members.some((member) => member.userId === currentUser.id);
    if (!isMember) return null;

    return members;
  } catch (error) {
    console.error('Error fetching workspace members:', error);
    throw {
      error_type: 'InternalServerError',
      message: 'An unexpected error occurred. Please try again later.',
    };
  }
}
