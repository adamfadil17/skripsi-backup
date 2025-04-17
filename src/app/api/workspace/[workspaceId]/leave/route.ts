import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { pusherServer } from '@/lib/pusher';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser.id || !currentUser.email) {
      return NextResponse.json(
        {
          status: 'error',
          code: 401,
          error_type: 'Unauthorized',
          message: 'Unauthorized access',
        },
        { status: 401 }
      );
    }

    const { workspaceId } = params;
    if (!workspaceId) {
      return NextResponse.json({
        status: 'error',
        code: 400,
        error_type: 'BadRequest',
        message: 'workspaceId is required',
      });
    }

    // Ambil workspace dengan anggota
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });

    if (!workspace) {
      return NextResponse.json(
        { status: 'error', code: 404, message: 'Workspace not found' },
        { status: 404 }
      );
    }

    const userMembership = workspace.members.find(
      (m) => m.userId === currentUser.id
    );

    if (!userMembership) {
      return NextResponse.json(
        {
          status: 'error',
          code: 403,
          message: 'You are not a member of this workspace',
        },
        { status: 403 }
      );
    }

    const superAdminCount = workspace.members.filter(
      (m) => m.role === 'SUPER_ADMIN'
    ).length;

    if (superAdminCount === 0) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          message: 'A workspace must have at least one Owner.',
        },
        { status: 400 }
      );
    }

    if (superAdminCount === 1 && userMembership.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          message:
            'You are the last Owner. Assign another Owner before leaving.',
        },
        { status: 400 }
      );
    }

    // Delete the member
    await prisma.$transaction([
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

    return NextResponse.json(
      {
        status: 'success',
        code: 200,
        message: 'Successfully left the workspace',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error leaving workspace:', error);
    return NextResponse.json(
      {
        status: 'error',
        code: 500,
        error_type: 'InternalServerError',
        message: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}
