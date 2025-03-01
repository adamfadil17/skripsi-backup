import prisma from '@/lib/prismadb';
import { getCurrentUser } from './getCurrentUser';

export async function getDocumentHeader(documentId: string) {
  if (!documentId) throw new Error('documentId is required');

  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const document = await prisma.document.findUnique({
      where: {
        id: documentId,
        workspace: {
          members: {
            some: { userId: user.id }, // Pastikan user memiliki akses
          },
        },
      },
      select: {
        id: true,
        title: true,
        emoji: true,
        coverImage: true,
      },
    });

    if (!document) throw new Error('Document not found');

    return document;
  } catch (error) {
    console.error('Error fetching document header:', error);
    throw new Error('Failed to fetch document header');
  }
}
