// lib/getWorkspaceDocuments.tsx
import prisma from '@/lib/prismadb';
import { WorkspaceDocument } from '@/types/types';
import { User } from '@prisma/client';

export async function getWorkspaceDocuments(
  workspaceId: string,
  currentUser: User
): Promise<WorkspaceDocument[] | null> {
  try {
    if (!currentUser.id || !currentUser.email) {
      throw new Error('User not authenticated');
    }

    // 🔐 Validasi apakah user adalah member dari workspace
    const isMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: currentUser.id,
          workspaceId,
        },
      },
    });

    if (!isMember) {
      return null;
    }

    // ✅ Ambil dokumen jika user valid
    const documents = await prisma.document.findMany({
      where: { workspaceId },
      select: {
        id: true,
        title: true,
        emoji: true,
        coverImage: true,
        createdAt: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        updatedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents;
  } catch (error) {
    console.error('Error fetching workspace documents:', error);
    throw {
      error_type: 'InternalServerError',
      message: 'An unexpected error occurred. Please try again later.',
    };
  }
}
