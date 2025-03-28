import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

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
          code: 400,
          error_type: 'BadRequest',
          message: 'workspaceId and documentId are required',
        },
        { status: 400 }
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

    await prisma.workspaceMember.delete({
      where: {
        userId_workspaceId: {
          userId: currentUser.id,
          workspaceId,
        },
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
