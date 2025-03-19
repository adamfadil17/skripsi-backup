import prisma from '@/lib/prismadb';
import { WorkspaceInfo } from '@/types/types';

export async function getWorkspaceInfo(workspaceId: string): Promise<WorkspaceInfo | null> {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        emoji: true,
        coverImage: true,
        members: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        documents: {
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
        },
        chat: {
          select: {
            id: true,
            messages: {
              select: {
                id: true,
                body: true,
                createdAt: true,
                sender: {
                  select: { id: true, name: true, email: true },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        notifications: {
          select: {
            id: true,
            message: true,
            type: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        invitations: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            invitedAt: true,
            invitedBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { invitedAt: 'desc' },
        },
      },
    });

    return workspace;
  } catch (error) {
    console.error('Error fetching workspace info:', error);
    throw new Error('Failed to fetch workspace info');
  }
}
