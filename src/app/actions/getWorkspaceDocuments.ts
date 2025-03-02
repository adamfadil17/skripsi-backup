import prisma from '@/lib/prismadb';
import { getCurrentUser } from './getCurrentUser';
import { Prisma } from '@prisma/client';

export async function getWorkspaceDocuments(workspaceId: string) {
  if (!workspaceId) throw new Error('workspaceId is required');

  try {
    // Validasi autentikasi pengguna
    const user = await getCurrentUser();
    if (!user?.id || !user?.email) {
      throw new Error('User not authenticated');
    }

    // Ambil dokumen di workspace yang memiliki akses sesuai user
    const documents = await prisma.document.findMany({
      where: {
        workspaceId,
        workspace: { members: { some: { userId: user.id } } },
      },
      select: {
        id: true,
        title: true,
        emoji: true,
        coverImage: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return documents;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error:', error.message);
    } else {
      console.error('Error fetching workspace documents:', error);
    }
    throw new Error('Failed to fetch documents');
  }
}
