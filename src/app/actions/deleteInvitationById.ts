// app/actions/deleteInvitationById.ts
import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';

interface DeleteInvitationParams {
  invitationId: string;
  workspaceId: string;
  currentUser: User;
}

export async function deleteInvitationById({
  invitationId,
  workspaceId,
  currentUser,
}: DeleteInvitationParams) {
  try {
    if (!currentUser?.id || !currentUser?.email) {
      throw {
        error_type: 'Unauthorized',
        message: 'Unauthorized access',
      };
    }

    if (!workspaceId || !invitationId) {
      throw {
        error_type: 'BadRequest',
        message: 'workspaceId and invitationId are required',
      };
    }

    // Cek peran pengguna di workspace
    const workspaceUser = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: currentUser.id, workspaceId },
      },
    });

    if (!workspaceUser) {
      throw {
        error_type: 'NotFound',
        message: 'User not found in workspace',
      };
    }

    const isSuperAdmin = workspaceUser.role === 'SUPER_ADMIN';
    const isAdmin = workspaceUser.role === 'ADMIN';

    // Cek apakah undangan ada
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId, workspaceId },
    });

    if (!invitation) {
      throw {
        error_type: 'NotFound',
        message: 'Invitation not found',
      };
    }

    const invitedEmail = invitation.email;

    // Validasi hak akses untuk mencabut undangan
    if (
      isSuperAdmin ||
      (isAdmin && invitation.invitedById === currentUser.id)
    ) {
      const [deletedInvitation] = await prisma.$transaction([
        prisma.invitation.delete({ where: { id: invitationId } }),
        prisma.notification.create({
          data: {
            workspaceId: invitation.workspaceId,
            userId: invitation.invitedById,
            type: 'INVITATION_REVOKE',
            message: `The invitation sent to ${invitedEmail} has been revoked by ${currentUser.name}.`,
          },
        }),
      ]);

      // Trigger Pusher event for real-time updates
      await pusherServer.trigger(
        `workspace-${workspaceId}`,
        'invitation-removed',
        invitationId
      );

      await pusherServer.trigger(
        `notification-${workspaceId}`,
        'invitation-removed',
        {
          id: invitationId,
          email: invitedEmail,
          revokedBy: {
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.image,
          },
        }
      );

      return {
        success: true,
        message: 'Invitation revoked successfully',
        deletedInvitation,
      };
    }

    throw {
      error_type: 'Forbidden',
      message: 'You do not have permission to revoke this invitation',
    };
  } catch (error) {
    console.error('Error deleting invitation:', error);
    throw error;
  }
}
