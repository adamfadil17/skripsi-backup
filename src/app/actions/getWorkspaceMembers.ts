import prisma from '@/lib/prismadb';
import { getCurrentUser } from './getCurrentUser';

export async function getWorkspaceMembers(workspaceId: string) {
  if (!workspaceId) throw new Error('workspaceId is required');

  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
      throw new Error('User not authenticated');
    }

    // Pastikan pengguna adalah anggota di workspace
    const isMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: currentUser.id,
      },
    });

    if (!isMember) throw new Error('User not authorized to view members');

    // Ambil semua anggota workspace
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        id: true,
        role: true, // SUPER_ADMIN, ADMIN, MEMBER
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        user: { name: 'asc' },
      },
    });

    return members.map((member) => ({
      id: member.id, // ID dari WorkspaceMember
      userId: member.user.id, // ID dari User
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
      role: member.role, // Role anggota
    }));
  } catch (error) {
    console.error('Error fetching workspace members:', error);
    throw new Error('Failed to fetch workspace members');
  }
}
