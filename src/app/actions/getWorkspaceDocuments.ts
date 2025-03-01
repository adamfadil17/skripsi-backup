import prisma from '@/lib/prismadb';
import { getCurrentUser } from './getCurrentUser';

export async function getWorkspaceDocuments(workspaceId: string) {
  if (!workspaceId) throw new Error('workspaceId is required');

  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const documents = await prisma.document.findMany({
      where: {
        workspaceId,
        workspace: { members: { some: { userId: user.id } } },
      },
      select: {
        id: true,
        title: true,
        emoji: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return documents;
  } catch (error) {
    console.error('Error fetching workspace documents:', error);
    throw new Error('Failed to fetch documents');
  }
}
