// src/app/actions/getDocumentById.ts
import prisma from '@/lib/prismadb';  

export async function getDocumentInfo(workspaceId: string, documentId: string) {
  if (!workspaceId || !documentId)
    throw new Error('workspaceId and documentId are required');

  try {
    const document = await prisma.document.findFirst({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        emoji: true,
        coverImage: true,
        createdAt: true,
      },
    });

    if (!document) throw new Error('Document not found');

    return document;
  } catch (error) {
    console.error('Error fetching document by ID:', error);
    throw new Error('Failed to fetch document');
  }
}
