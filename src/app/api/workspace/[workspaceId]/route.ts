import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceInfo } from '@/app/actions/getWorkspaceInfo';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import prisma from '@/lib/prismadb';

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
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
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Workspace ID is required',
        },
        { status: 400 }
      );
    }

    const workspace = await getWorkspaceInfo(workspaceId, currentUser);
    if (!workspace) {
      return NextResponse.json(
        {
          status: 'error',
          code: 404,
          error_type: 'NotFound',
          message: 'Workspace not found',
        },
        { status: 404 }
      );
    }

    // const isMember = workspace.members.some(
    //   (member) => member.user.id === currentUser.id
    // );
    // if (!isMember) {
    //   return NextResponse.json(
    //     {
    //       status: 'error',
    //       code: 403,
    //       error_type: 'Forbidden',
    //       message: 'Forbidden',
    //     },
    //     { status: 403 }
    //   );
    // }

    return NextResponse.json(
      { status: 'success', code: 200, data: { workspace } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching workspace:', error);
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

export async function PUT(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser?.email) {
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
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Workspace ID is required',
        },
        { status: 400 }
      );
    }

    // Ambil data dari body
    const { name, emoji, coverImage } = await req.json();
    if (!name || !emoji || !coverImage) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'All fields are required',
        },
        { status: 400 }
      );
    }

    // Validasi: Cek apakah user adalah SUPER_ADMIN di workspace ini
    const userWorkspace = await prisma.workspaceMember.findFirst({
      where: {
        userId: currentUser.id,
        workspaceId,
        role: 'SUPER_ADMIN',
      },
    });

    if (!userWorkspace) {
      return NextResponse.json(
        {
          status: 'error',
          code: 403,
          error_type: 'Forbidden',
          message: 'Forbidden: Only Owner can update workspace',
        },
        { status: 403 }
      );
    }

    // Update workspace
    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name, emoji, coverImage },
    });

    return NextResponse.json(
      {
        status: 'success',
        code: 200,
        message: 'Workspace updated successfully',
        data: { updatedWorkspace },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating workspace:', error);
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
export async function DELETE(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    // Ambil user saat ini
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser?.email) {
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
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Workspace ID is required',
        },
        { status: 400 }
      );
    }

    // Temukan workspace berdasarkan id, sertakan member untuk validasi peran
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });

    if (!workspace) {
      return NextResponse.json(
        {
          status: 'error',
          code: 404,
          error_type: 'NotFound',
          message: 'Workspace not found',
        },
        { status: 404 }
      );
    }

    // Validasi apakah currentUser adalah SUPER_ADMIN di workspace tersebut
    const isOwner = workspace.members.some(
      (member) =>
        member.userId === currentUser.id && member.role === 'SUPER_ADMIN'
    );

    if (!isOwner) {
      return NextResponse.json(
        {
          status: 'error',
          code: 403,
          error_type: 'Forbidden',
          message: 'Forbidden',
        },
        { status: 403 }
      );
    }

    // Hapus workspace
    const deletedWorkspace = await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    return NextResponse.json(
      {
        status: 'success',
        code: 200,
        message: 'Workspace deleted successfully',
        data: { deletedWorkspace },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting workspace:', error);
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
