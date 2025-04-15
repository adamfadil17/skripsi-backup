import { type NextRequest, NextResponse } from 'next/server';
import { getWorkspaceInfo } from '@/app/actions/getWorkspaceInfo';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import prisma from '@/lib/prismadb';
import { pusherServer } from '@/lib/pusher';

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

    // Use the existing getWorkspaceInfo action
    const workspace = await getWorkspaceInfo(workspaceId, currentUser);

    if (!workspace) {
      return NextResponse.json(
        {
          status: 'error',
          code: 404,
          error_type: 'NotFound',
          message: 'Workspace not found or access denied',
        },
        { status: 404 }
      );
    }

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

    // Get data from body
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

    // Validate: Check if user is SUPER_ADMIN in this workspace
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

    // Create notification for workspace update
    await prisma.notification.create({
      data: {
        workspaceId,
        message: `${currentUser.name} updated workspace profile`,
        type: 'WORKSPACE_UPDATE',
        userId: currentUser.id,
      },
    });

    // Trigger Pusher event for real-time updates
    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      'workspace-updated',
      {
        ...updatedWorkspace,
        updatedBy: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          image: currentUser.image,
        },
      }
    );

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
    // Get current user
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

    // Find workspace by id, include members for role validation
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

    // Validate if currentUser is SUPER_ADMIN in the workspace
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

    // Delete workspace
    const deletedWorkspace = await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    // Trigger Pusher event for real-time updates
    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      'workspace-deleted',
      workspaceId
    );

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
