// lib/acceptInvitation.ts
import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';

interface AcceptInvitationResult {
  workspaceName?: string;
  newMember: any;
}

export async function acceptInvitation(
  invitationId: string,
  currentUser: User
): Promise<AcceptInvitationResult> {
  try {
    if (!currentUser?.id || !currentUser?.email) {
      throw {
        error_type: 'Unauthorized',
        message: 'Unauthorized access',
      };
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      throw {
        error_type: 'NotFound',
        message: 'Invitation not found or expired',
      };
    }

    // Check if email matches the invitation
    if (currentUser.email !== invitation.email) {
      throw {
        error_type: 'Forbidden',
        message: 'Forbidden: Email does not match the invitation',
      };
    }

    // Check if user is already a workspace member
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: invitation.workspaceId,
        userId: currentUser.id,
      },
    });

    if (existingMember) {
      throw {
        error_type: 'UserIsMember',
        message: 'You are already a member of this workspace',
      };
    }

    if (new Date() > invitation.expiredAt) {
      throw {
        error_type: 'InvitationExpired',
        message: 'Invitation expired',
      };
    }

    // Add user to workspace
    const [newMember, _] = await prisma.$transaction([
      prisma.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: currentUser.id,
          role: invitation.role,
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
      }),
      prisma.invitation.delete({ where: { id: invitationId } }),
      prisma.notification.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: currentUser.id,
          type: 'MEMBER_CREATE',
          message: `${currentUser.name} has joined the workspace ${invitation.workspace?.name}. Welcome aboard!`,
        },
      }),
    ]);

    // Trigger Pusher events
    await pusherServer.trigger(
      `workspace-${invitation.workspaceId}`,
      'member-added',
      newMember
    );

    await pusherServer.trigger(
      `workspace-${invitation.workspaceId}`,
      'invitation-removed',
      invitation.id
    );

    await pusherServer.trigger(
      `notification-${invitation.workspaceId}`,
      'member-added',
      {
        member: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          image: currentUser.image,
        },
        addedBy: invitation.invitedById || {
          id: 'system',
          name: 'System',
          image: null,
        },
      }
    );

    await pusherServer.trigger(
      `notification-${invitation.workspaceId}`,
      'invitation-removed',
      {
        id: invitation.id,
        email: invitation.email,
        revokedBy: {
          id: currentUser.id,
          name: currentUser.name,
          image: currentUser.image,
        },
      }
    );

    return {
      workspaceName: invitation.workspace?.name,
      newMember,
    };
  } catch (error) {
    console.error('Error accepting invitation:', error);
    throw error;
  }
}
