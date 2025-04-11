// src/app/actions/getLatestDocument.ts
import prisma from '@/lib/prismadb';

export async function getLatestDocument(workspaceId: string) {
  if (!workspaceId) throw new Error('workspaceId is required');

  try {
    const document = await prisma.document.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        emoji: true,
        coverImage: true,
        createdAt: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!document) return null;

    return document;
  } catch (error) {
    console.error('Error fetching latest document:', error);
    throw new Error('Failed to fetch latest document');
  }
}
