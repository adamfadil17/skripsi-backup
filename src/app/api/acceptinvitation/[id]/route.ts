import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { pusherServer } from '@/lib/pusher';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
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
      return NextResponse.json(
        { message: 'Invitation not found or expired' },
        { status: 404 }
      );
    }

    // Check if email matches the invitation
    if (currentUser.email !== invitation.email) {
      return NextResponse.json(
        { message: 'Forbidden: Email does not match the invitation' },
        { status: 403 }
      );
    }

    // Check if user is already a workspace member
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: invitation.workspaceId,
        userId: currentUser.id,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        {
          error_type: 'UserIsMember',
          message: 'You are already a member of this workspace',
        },
        { status: 400 }
      );
    }

    if (new Date() > invitation.expiredAt) {
      return NextResponse.json(
        { message: 'Invitation expired' },
        { status: 400 }
      );
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
      prisma.invitation.delete({ where: { id: params.id } }),
      prisma.notification.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: currentUser.id,
          type: 'MEMBER_CREATE',
          message: `${currentUser.name} has joined the workspace ${invitation.workspace?.name}. Welcome aboard!`,
        },
      }),
    ]);

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

    // Trigger Pusher events
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

    return NextResponse.json({
      status: 'success',
      code: 200,
      message: 'Invitation accepted',
      data: {
        workspaceName: invitation.workspace?.name,
        newMember,
      },
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
