import prisma from '@/lib/prismadb';
import { getCurrentUser } from './getCurrentUser';

export async function getWorkspaceMembers(workspaceId: string) {
  if (!workspaceId) throw new Error('workspaceId is required');

  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Ensure the user is part of the workspace
    const isMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: user.id,
      },
    });

    if (!isMember) throw new Error('User not authorized to view members');

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        id: true,
        role: true,
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
      id: member.id, // ID from WorkspaceMember
      userId: member.user.id, // User ID
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
      role: member.role, // SUPER_ADMIN, ADMIN, MEMBER
    }));
  } catch (error) {
    console.error('Error fetching workspace members:', error);
    throw new Error('Failed to fetch workspace members');
  }
}
