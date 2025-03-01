// src/lib/getWorkspaceDocuments.ts

import prisma from '@/lib/prismadb';

export async function getWorkspaceDocuments(workspaceId: string, userId: string) {
  if (!workspaceId || !userId) throw new Error('workspaceId and userId are required');

  try {
    const documents = await prisma.document.findMany({
      where: {
        workspaceId,
        workspace: { members: { some: { userId } } },
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
