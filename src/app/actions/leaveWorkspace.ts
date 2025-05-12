// app/actions/leaveWorkspace.ts
import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';

export async function leaveWorkspace(workspaceId: string, currentUser: User) {
  try {
    if (!currentUser?.id || !currentUser?.email) {
      throw {
        error_type: 'Unauthorized',
        message: 'Unauthorized access',
      };
    }

    if (!workspaceId) {
      throw {
        error_type: 'BadRequest',
        message: 'Workspace ID is required',
      };
    }

    // Get workspace with members
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });

    if (!workspace) {
      throw {
        error_type: 'NotFound',
        message: 'Workspace not found',
      };
    }

    const userMembership = workspace.members.find(
      (m) => m.userId === currentUser.id
    );

    if (!userMembership) {
      throw {
        error_type: 'Forbidden',
        message: 'You are not a member of this workspace',
      };
    }

    const superAdminCount = workspace.members.filter(
      (m) => m.role === 'SUPER_ADMIN'
    ).length;

    if (superAdminCount === 0) {
      throw {
        error_type: 'BadRequest',
        message: 'A workspace must have at least one Owner.',
      };
    }

    if (superAdminCount === 1 && userMembership.role === 'SUPER_ADMIN') {
      throw {
        error_type: 'BadRequest',
        message: 'You are the last Owner. Assign another Owner before leaving.',
      };
    }

    // Delete the member in a transaction
    const result = await prisma.$transaction([
      prisma.workspaceMember.delete({
        where: {
          userId_workspaceId: {
            userId: currentUser.id,
            workspaceId,
          },
        },
      }),
      prisma.notification.create({
        data: {
          workspaceId,
          userId: currentUser.id,
          type: 'MEMBER_LEAVE',
          message: `${currentUser.name} left the workspace`,
        },
      }),
    ]);

    // Trigger Pusher event for real-time updates
    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      'member-leaved',
      currentUser.id
    );

    await pusherServer.trigger(`notification-${workspaceId}`, 'member-leaved', {
      member: {
        id: currentUser.id,
        name: currentUser.name,
        image: currentUser.image,
      },
    });

    return result[0]; // Return the deleted member
  } catch (error) {
    console.error('Error leaving workspace:', error);
    throw error;
  }
}
