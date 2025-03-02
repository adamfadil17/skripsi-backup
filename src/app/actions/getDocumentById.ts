// src/app/actions/getDocumentById.ts
import prisma from '@/lib/prismadb';
import { getCurrentUser } from './getCurrentUser';

export async function getDocumentById(workspaceId: string, documentId: string) {
  if (!workspaceId || !documentId)
    throw new Error('workspaceId and documentId are required');

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser?.email) {
      throw new Error('Unauthorized');
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        workspaceId,
        workspace: {
          members: {
            some: { userId: currentUser.id },
          },
        },
      },
      select: {
        id: true,
        title: true,
        emoji: true,
        coverImage: true,
        updatedAt: true,
        createdAt: true,
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        updatedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        documentContents: true,
      },
    });

    if (!document) throw new Error('Document not found');

    return document;
  } catch (error) {
    console.error('Error fetching document by ID:', error);
    throw new Error('Failed to fetch document');
  }
}
