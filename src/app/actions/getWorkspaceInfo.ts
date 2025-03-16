import prisma from '@/lib/prismadb';
import { WorkspaceInfo } from '@/types/types';

export async function getWorkspaceInfo(workspaceId: string): Promise<WorkspaceInfo | null> {
  try {

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
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return workspace;
  } catch (error) {
    console.error('Error fetching workspace info:', error);
    throw new Error('Failed to fetch workspace info');
  }
}
