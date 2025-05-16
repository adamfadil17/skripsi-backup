// app/actions/getDocumentContent.ts
import prisma from '@/lib/prismadb';

export async function getDocumentContentById(documentId: string) {
  try {
    if (!documentId) {
      throw {
        error_type: 'BadRequest',
        message: 'Document ID is required',
      };
    }

    // Get the latest document content
    const documentContent = await prisma.documentContent.findFirst({
      where: { documentId },
      orderBy: { editedAt: 'desc' }, // Ensure we get the most recent version
      select: { content: true },
    });

    if (!documentContent) {
      throw {
        error_type: 'NotFound',
        message: 'Document content not found',
      };
    }

    return documentContent;
  } catch (error) {
    console.error('Error fetching document content:', error);
    throw error;
  }
}