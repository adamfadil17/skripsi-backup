import prisma from '@/lib/prismadb';
import { getCurrentUser } from './getCurrentUser';
import { UserWorkspace } from '@/types/types';

export async function getUserWorkspaces(): Promise<UserWorkspace[]> {
  try {
    const user = await getCurrentUser();
    if (!user?.id || !user?.email) {
      throw new Error('User not authenticated');
    }

    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId: user.id,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        emoji: true,
        coverImage: true,
        _count: {
          select: {
            documents: true,
          },
        },
        members: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    });

    return workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      emoji: workspace.emoji || '💼',
      coverImage: workspace.coverImage || '/images/placeholder.svg',
      documentCount: workspace._count.documents,
      members: workspace.members,
    }));
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    throw new Error('Failed to fetch workspaces');
  }
}
