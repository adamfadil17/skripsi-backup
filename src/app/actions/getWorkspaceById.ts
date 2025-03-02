import prisma from '@/lib/prismadb';
import { getCurrentUser } from './getCurrentUser';

export async function getWorkspaceById(workspaceId: string) {
  try {
    const user = await getCurrentUser();
    if (!user?.id || !user?.email) {
      throw new Error('User not authenticated');
    }
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: true, // Menyertakan informasi user dari setiap member
          },
        },
        documents: true,
        chat: true,
        invitations: true,
        notifications: true,
      },
    });

    return workspace;
  } catch (error) {
    console.error('Error fetching workspace by id:', error);
    throw new Error('Failed to fetch workspace');
  }
}
