// app/actions/updateMemberRoleById.ts
import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';

interface UpdateRoleParams {
  userId: string;
  workspaceId: string;
  newRole: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
  currentUser: User;
}

export async function updateMemberRoleById({
  userId,
  workspaceId,
  newRole,
  currentUser,
}: UpdateRoleParams) {
  try {
    if (!currentUser.id || !currentUser.email) {
      throw {
        error_type: 'Unauthorized',
        message: 'Unauthorized access',
      };
    }

    if (!userId || !workspaceId || !newRole) {
      throw {
        error_type: 'BadRequest',
        message: 'Missing required fields: userId, workspaceId, or newRole',
      };
    }

    // Ambil informasi pengguna yang melakukan perubahan role
    const workspaceUser = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: currentUser.id, workspaceId },
      },
    });

    // Ambil informasi pengguna target yang akan diubah rolenya
    const targetUser = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
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

    if (!workspaceUser || !targetUser) {
      throw {
        error_type: 'NotFound',
        message: 'User not found in workspace',
      };
    }

    const isSuperAdmin = workspaceUser.role === 'SUPER_ADMIN';
    const isAdmin = workspaceUser.role === 'ADMIN';
    const isMember = workspaceUser.role === 'MEMBER';

    // Tidak boleh mengubah peran diri sendiri
    if (userId === currentUser.id) {
      throw {
        error_type: 'Forbidden',
        message: 'You cannot change your own role',
      };
    }

    // Admin tidak boleh mengubah Super Admin
    if (isAdmin && targetUser.role === 'SUPER_ADMIN') {
      throw {
        error_type: 'Forbidden',
        message: 'Admin cannot change Super Admin role',
      };
    }

    // Admin tidak boleh mempromosikan pengguna menjadi Super Admin
    if (isAdmin && newRole === 'SUPER_ADMIN') {
      throw {
        error_type: 'Forbidden',
        message: 'Admin cannot promote to Super Admin',
      };
    }

    // Super Admin bisa mempromosikan Admin atau Member menjadi Super Admin
    if (isSuperAdmin && newRole === 'SUPER_ADMIN') {
      const [updatedMember, _notification] = await prisma.$transaction([
        prisma.workspaceMember.update({
          where: {
            userId_workspaceId: { userId, workspaceId },
          },
          data: { role: newRole },
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
        }),
        prisma.notification.create({
          data: {
            workspaceId,
            userId: currentUser.id,
            type: 'MEMBER_UPDATE',
            message: `${currentUser.name} promoted ${targetUser.user.name} to Super Admin`,
          },
        }),
      ]);

      // Trigger Pusher event for real-time updates
      await pusherServer.trigger(
        `workspace-${workspaceId}`,
        'member-updated',
        updatedMember
      );

      await pusherServer.trigger(
        `notification-${workspaceId}`,
        'member-updated',
        {
          member: updatedMember.user,
          updatedBy: {
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.image,
          },
        }
      );

      return updatedMember;
    }

    // Super Admin bisa menurunkan Super Admin lain, tapi harus memastikan masih ada minimal satu Super Admin
    if (
      isSuperAdmin &&
      targetUser.role === 'SUPER_ADMIN' &&
      newRole !== 'SUPER_ADMIN'
    ) {
      const superAdminCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: 'SUPER_ADMIN' },
      });

      if (superAdminCount <= 1) {
        throw {
          error_type: 'Forbidden',
          message: 'At least one Super Admin must remain',
        };
      }

      const [updatedMember, _notification] = await prisma.$transaction([
        prisma.workspaceMember.update({
          where: {
            userId_workspaceId: { userId, workspaceId },
          },
          data: { role: newRole },
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
        }),
        prisma.notification.create({
          data: {
            workspaceId,
            userId: currentUser.id,
            type: 'MEMBER_UPDATE',
            message: `${currentUser.name} changed ${targetUser.user.name} role from Super Admin to ${newRole}`,
          },
        }),
      ]);

      // Trigger Pusher event for real-time updates
      await pusherServer.trigger(
        `workspace-${workspaceId}`,
        'member-updated',
        updatedMember
      );

      await pusherServer.trigger(
        `notification-${workspaceId}`,
        'member-updated',
        {
          member: updatedMember.user,
          updatedBy: {
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.image,
          },
        }
      );

      return updatedMember;
    }

    // Super Admin mengubah role Admin atau Member (selain menjadi Super Admin, yang sudah ditangani di atas)
    if (isSuperAdmin && newRole !== 'SUPER_ADMIN') {
      const [updatedMember, _notification] = await prisma.$transaction([
        prisma.workspaceMember.update({
          where: {
            userId_workspaceId: { userId, workspaceId },
          },
          data: { role: newRole },
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
        }),
        prisma.notification.create({
          data: {
            workspaceId,
            userId: currentUser.id,
            type: 'MEMBER_UPDATE',
            message: `${currentUser.name} changed ${targetUser.user.name} role to ${newRole}`,
          },
        }),
      ]);

      // Trigger Pusher event for real-time updates
      await pusherServer.trigger(
        `workspace-${workspaceId}`,
        'member-updated',
        updatedMember
      );

      await pusherServer.trigger(
        `notification-${workspaceId}`,
        'member-updated',
        {
          member: updatedMember.user,
          updatedBy: {
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.image,
          },
        }
      );

      return updatedMember;
    }

    // Admin mempromosikan Member menjadi Admin
    if (isAdmin && targetUser.role === 'MEMBER' && newRole === 'ADMIN') {
      const [updatedMember, _notification] = await prisma.$transaction([
        prisma.workspaceMember.update({
          where: {
            userId_workspaceId: { userId, workspaceId },
          },
          data: { role: newRole },
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
        }),
        prisma.notification.create({
          data: {
            workspaceId,
            userId: currentUser.id,
            type: 'MEMBER_UPDATE',
            message: `${currentUser.name} promoted ${targetUser.user.name} to Admin`,
          },
        }),
      ]);

      // Trigger Pusher event for real-time updates
      await pusherServer.trigger(
        `workspace-${workspaceId}`,
        'member-updated',
        updatedMember
      );

      await pusherServer.trigger(
        `notification-${workspaceId}`,
        'member-updated',
        {
          member: updatedMember.user,
          updatedBy: {
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.image,
          },
        }
      );

      return updatedMember;
    }

    // Admin tidak bisa menurunkan Admin menjadi Member
    if (isAdmin && targetUser.role === 'ADMIN' && newRole === 'MEMBER') {
      throw {
        error_type: 'Forbidden',
        message: 'Admin cannot demote another Admin to Member',
      };
    }

    // Member tidak bisa mengubah role siapa pun
    if (isMember) {
      throw {
        error_type: 'Forbidden',
        message: 'Members cannot change roles',
      };
    }

    throw {
      error_type: 'Forbidden',
      message: 'No valid role changes allowed',
    };
  } catch (error) {
    console.error('Error updating member role:', error);
    throw error;
  }
}
