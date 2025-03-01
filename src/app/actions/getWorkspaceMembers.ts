import prisma from '@/lib/prismadb';

export async function getWorkspaceMembers(workspaceId: string) {
  try {
    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
      },
      select: {
        id: true,
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true, // Jika ada avatar atau foto profil
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });

    return members.map((member) => ({
      id: member.id, // ID dari WorkspaceMember
      userId: member.user.id, // ID dari User
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
      role: member.role, // SUPER_ADMIN, ADMIN, atau MEMBER
    }));
  } catch (error) {
    console.error('Error fetching workspace members:', error);
    throw new Error('Failed to fetch workspace members');
  }
}
