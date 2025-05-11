// app/actions/createInvitation.ts
import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';
import { sendInvitation } from '@/app/actions/sendInvitation';

interface CreateInvitationParams {
  email: string;
  workspaceId: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
  currentUser: User;
}

export async function createInvitation({
  email,
  workspaceId,
  role,
  currentUser,
}: CreateInvitationParams) {
  try {
    // Cek apakah user sudah login
    if (!currentUser?.id || !currentUser?.email) {
      throw {
        error_type: 'Unauthorized',
        message: 'Unauthorized access. Please log in.',
      };
    }

    if (!workspaceId) {
      throw {
        error_type: 'BadRequest',
        message: 'Workspace ID is required',
      };
    }

    // Validasi input
    if (!email || !role) {
      throw {
        error_type: 'BadRequest',
        message: 'Missing required fields: email or role.',
      };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Cek apakah email sudah menjadi member workspace
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: {
          email: normalizedEmail,
        },
      },
    });

    if (existingMember) {
      throw {
        error_type: 'AlreadyMember',
        message: 'This user is already a member of the workspace.',
      };
    }

    // Cek apakah email sudah menerima invitation sebelumnya
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        workspaceId,
        email: normalizedEmail,
      },
    });

    if (existingInvitation) {
      throw {
        error_type: 'AlreadyInvited',
        message: 'This user has already been invited to the workspace.',
      };
    }

    // Cek role dari currentUser
    const workspaceUser = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: currentUser.id, workspaceId },
      },
    });

    if (!workspaceUser) {
      throw {
        error_type: 'Forbidden',
        message: 'You are not a member of this workspace.',
      };
    }

    // Hanya Super Admin yang bisa memberikan role SUPER_ADMIN atau ADMIN
    if (workspaceUser.role !== 'SUPER_ADMIN') {
      if (role === 'SUPER_ADMIN') {
        throw {
          error_type: 'Forbidden',
          message: 'Only Super Admin can invite users with role SUPER_ADMIN.',
        };
      }

      // Admin hanya bisa mengundang user dengan role MEMBER
      if (workspaceUser.role === 'ADMIN' && role !== 'MEMBER') {
        throw {
          error_type: 'Forbidden',
          message: 'Admin can only invite users with role MEMBER.',
        };
      }

      // Member tidak bisa mengundang siapapun
      if (workspaceUser.role === 'MEMBER') {
        throw {
          error_type: 'Forbidden',
          message: 'Members cannot invite users.',
        };
      }
    }

    // Kirim undangan
    const invitation = await sendInvitation(
      normalizedEmail,
      workspaceId,
      currentUser.id,
      role
    );

    await prisma.notification.create({
      data: {
        workspaceId,
        userId: currentUser.id,
        type: 'INVITATION_CREATE',
        message: `${currentUser.name} invited ${normalizedEmail} to join this workspace.`,
      },
    });

    // Trigger Pusher event for real-time updates
    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      'invitation-added',
      invitation
    );

    await pusherServer.trigger(
      `notification-${workspaceId}`,
      'invitation-added',
      {
        id: invitation.id,
        email: invitation.email,
        invitedBy: {
          id: currentUser.id,
          name: currentUser.name,
          image: currentUser.image,
        },
      }
    );

    return invitation;
  } catch (error) {
    console.error('Error creating invitation:', error);
    throw error;
  }
}
