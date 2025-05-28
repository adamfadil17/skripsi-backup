import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prismadb';

export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = params;

    // Get workspace and check if user has access
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        members: {
          some: {
            user: {
              email: session.user.email,
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        googleMeetUrl: true,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      permanentMeetUrl: workspace.googleMeetUrl,
    });
  } catch (error) {
    console.error('Error fetching workspace meeting info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = params;
    const { googleMeetUrl } = await request.json();

    // Check if user is admin of the workspace
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: {
          email: session.user.email,
        },
        role: {
          in: ['ADMIN', 'SUPER_ADMIN'],
        },
      },
    });

    if (!workspaceMember) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Update workspace with permanent Google Meet URL
    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { googleMeetUrl },
      select: {
        id: true,
        name: true,
        googleMeetUrl: true,
      },
    });

    // Create a notification about the updated meeting URL
    await prisma.notification.create({
      data: {
        workspaceId,
        message: 'Workspace meeting link has been updated',
        type: 'WORKSPACE_UPDATE',
        userId: (
          await prisma.user.findUnique({ where: { email: session.user.email } })
        )?.id,
      },
    });

    return NextResponse.json(updatedWorkspace);
  } catch (error) {
    console.error('Error updating workspace meeting URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
