import prisma from '@/lib/prismadb';
import { getCurrentUser } from './getCurrentUser';

export async function getWorkspaceById(workspaceId: string) {
  if (!workspaceId) throw new Error('workspaceId is required');

  try {
    const user = await getCurrentUser();
    if (!user?.id || !user?.email) {
      throw new Error('User not authenticated');
    }

    // Validasi apakah pengguna memiliki akses ke workspace
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          where: { userId: user.id },
          select: { role: true },
        },
      },
    });

    if (!workspace || workspace.members.length === 0) {
      throw new Error('Unauthorized or workspace not found');
    }

    return {
      id: workspace.id,
      name: workspace.name,
      role: workspace.members[0].role,
    };
  } catch (error) {
    console.error('Error fetching workspace:', error);
    throw new Error('Failed to fetch workspace');
  }
}
