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
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = params;
    if (!workspaceId) {
      return NextResponse.json(
        { message: 'Workspace id is required' },
        { status: 400 }
      );
    }

    const workspace = await getWorkspaceInfo(workspaceId);
    if (!workspace) {
      return NextResponse.json(
        { message: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Validate if the user is a member of the workspace
    const isMember = workspace.members.some(
      (member) => member.user.id === currentUser.id
    );
    if (!isMember) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, workspace }, { status: 200 });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
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
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = params;
    if (!workspaceId) {
      return NextResponse.json(
        { message: 'Workspace id is required' },
        { status: 400 }
      );
    }

    // Ambil data dari body
    const { name, emoji, coverImage } = await req.json();

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
        { message: 'Forbidden: Only Owner can update workspace' },
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
        success: true,
        message: 'Workspace updated successfully',
        updatedWorkspace,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating workspace:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
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
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = params;
    if (!workspaceId) {
      return NextResponse.json(
        { message: 'Workspace ID is required' },
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
        { message: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Validasi apakah currentUser adalah SUPER_ADMIN di workspace tersebut
    const isOwner = workspace.members.some(
      (member) =>
        member.userId === currentUser.id && member.role === 'SUPER_ADMIN'
    );

    if (!isOwner) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Hapus workspace
    const deletedWorkspace = await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Workspace deleted successfully',
        deletedWorkspace,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting workspace:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
