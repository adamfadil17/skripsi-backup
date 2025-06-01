import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';

interface DeleteMemberParams {
  userId: string;
  workspaceId: string;
  currentUser: User;
}

export async function deleteMemberById({
  userId,
  workspaceId,
  currentUser,
}: DeleteMemberParams) {
  try {
    if (!currentUser.id || !currentUser.email) {
      throw {
        error_type: 'Unauthorized',
        message: 'Unauthorized access. Please log in.',
      };
    }

    if (!workspaceId || !userId) {
      throw {
        error_type: 'BadRequest',
        message: 'Workspace ID and User ID are required',
      };
    }

    const currentUserRole = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: currentUser.id },
    });

    if (!currentUserRole) {
      throw {
        error_type: 'Forbidden',
        message: 'You are not a member of this workspace',
      };
    }

    const targetUserRole = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!targetUserRole) {
      throw {
        error_type: 'NotFound',
        message: 'User not found in this workspace',
      };
    }

    if (
      currentUserRole.role === 'ADMIN' &&
      (targetUserRole.role === 'SUPER_ADMIN' || targetUserRole.role === 'ADMIN')
    ) {
      throw {
        error_type: 'Forbidden',
        message: 'Admin cannot remove Super Admin or Admin',
      };
    }

    if (currentUserRole.role === 'ADMIN' && targetUserRole.role === 'MEMBER') {
      await prisma.$transaction([
        prisma.workspaceMember.delete({
          where: { userId_workspaceId: { userId, workspaceId } },
        }),
        prisma.notification.create({
          data: {
            workspaceId,
            userId: currentUser.id,
            type: 'MEMBER_DELETE',
            message: `${currentUser.name} removed ${targetUserRole.user.name} from the workspace.`,
          },
        }),
      ]);

      await pusherServer.trigger(
        `workspace-${workspaceId}`,
        'member-removed',
        userId
      );

      await pusherServer.trigger(
        `notification-${workspaceId}`,
        'member-removed',
        {
          userId,
          member: {
            id: targetUserRole.user.id,
            name: targetUserRole.user.name || 'A member',
            image: targetUserRole.user.image,
          },
          deletedBy: {
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.image,
          },
        }
      );

      return {
        success: true,
        message: 'Member removed successfully.',
      };
    }

    if (currentUserRole.role === 'SUPER_ADMIN') {
      if (targetUserRole.role === 'SUPER_ADMIN') {
        const superAdminCount = await prisma.workspaceMember.count({
          where: { workspaceId, role: 'SUPER_ADMIN' },
        });

        if (superAdminCount <= 1) {
          throw {
            error_type: 'Forbidden',
            message: 'Cannot remove the last Super Admin from workspace.',
          };
        }
      }

      await prisma.$transaction([
        prisma.workspaceMember.delete({
          where: { userId_workspaceId: { userId, workspaceId } },
        }),
        prisma.notification.create({
          data: {
            workspaceId,
            userId: currentUser.id,
            type: 'MEMBER_DELETE',
            message: `${currentUser.name} removed ${targetUserRole.user.name} from the workspace.`,
          },
        }),
      ]);

      await pusherServer.trigger(
        `workspace-${workspaceId}`,
        'member-removed',
        userId
      );

      await pusherServer.trigger(
        `notification-${workspaceId}`,
        'member-removed',
        {
          userId,
          member: {
            id: targetUserRole.user.id,
            name: targetUserRole.user.name || 'A member',
            image: targetUserRole.user.image,
          },
          deletedBy: {
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.image,
          },
        }
      );

      return {
        success: true,
        message: 'Member removed successfully.',
      };
    }

    throw {
      error_type: 'Forbidden',
      message: 'You do not have permission to remove this user.',
    };
  } catch (error) {
    console.error('Error removing member:', error);
    throw error;
  }
}
