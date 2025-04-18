import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import prisma from '@/lib/prismadb';
import { pusherServer } from '@/lib/pusher';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { workspaceId: string; invitationId: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id || !currentUser?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, invitationId } = params;
  if (!workspaceId || !invitationId) {
    return NextResponse.json(
      {
        status: 'error',
        code: 400,
        error_type: 'BadRequest',
        message: 'workspaceId and invitationId are required',
      },
      { status: 400 }
    );
  }

  try {
    // Cek peran pengguna di workspace
    const workspaceUser = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: currentUser.id, workspaceId },
      },
    });

    if (!workspaceUser) {
      return NextResponse.json(
        { message: 'User not found in workspace' },
        { status: 404 }
      );
    }

    const isSuperAdmin = workspaceUser.role === 'SUPER_ADMIN';
    const isAdmin = workspaceUser.role === 'ADMIN';

    // Cek apakah undangan ada
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId, workspaceId },
    });

    if (!invitation) {
      return NextResponse.json(
        { message: 'Invitation not found' },
        { status: 404 }
      );
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

      return NextResponse.json(
        {
          status: 'success',
          code: 200,
          message: 'Invitation revoked successfully',
          data: { deletedInvitation },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: 'You do not have permission to revoke this invitation' },
      { status: 403 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
