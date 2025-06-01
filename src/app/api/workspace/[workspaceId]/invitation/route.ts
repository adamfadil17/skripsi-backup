import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { getWorkspaceInvitations } from '@/app/actions/getWorkspaceInvitations';
import { createInvitation } from '@/app/actions/createInvitation';

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

    const invitations = await getWorkspaceInvitations(workspaceId, currentUser);

    if (!invitations) {
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
      {
        status: 'success',
        code: 200,
        data: { invitations: invitations || [] },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching workspace invitations:', error);
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

export async function POST(
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
          message: 'Unauthorized access. Please log in.',
        },
        { status: 401 }
      );
    }

    const { email, role } = await req.json();
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

    try {
      const invitation = await createInvitation({
        email,
        workspaceId,
        role,
        currentUser,
      });

      return NextResponse.json(
        {
          status: 'success',
          code: 201,
          message: 'Invitation sent successfully.',
          data: invitation,
        },
        { status: 201 }
      );
    } catch (error: any) {
      if (error.error_type === 'BadRequest') {
        return NextResponse.json(
          {
            status: 'error',
            code: 400,
            error_type: error.error_type,
            message: error.message || 'Invalid request',
          },
          { status: 400 }
        );
      } else if (error.error_type === 'Unauthorized') {
        return NextResponse.json(
          {
            status: 'error',
            code: 401,
            error_type: error.error_type,
            message: error.message || 'Unauthorized access',
          },
          { status: 401 }
        );
      } else if (error.error_type === 'Forbidden') {
        return NextResponse.json(
          {
            status: 'error',
            code: 403,
            error_type: error.error_type,
            message: error.message || 'Permission denied',
          },
          { status: 403 }
        );
      } else if (
        error.error_type === 'AlreadyMember' ||
        error.error_type === 'AlreadyInvited'
      ) {
        return NextResponse.json(
          {
            status: 'error',
            code: 400,
            error_type: error.error_type,
            message: error.message,
          },
          { status: 400 }
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error sending invitation:', error);
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
