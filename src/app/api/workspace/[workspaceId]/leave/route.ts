import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { leaveWorkspace } from '@/app/actions/leaveWorkspace';

export async function DELETE(
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

    await leaveWorkspace(workspaceId, currentUser);

    return NextResponse.json(
      {
        status: 'success',
        code: 200,
        message: 'Successfully left the workspace',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error leaving workspace:', error);

    // Handle specific error types
    if (error.error_type === 'Forbidden') {
      return NextResponse.json(
        {
          status: 'error',
          code: 403,
          error_type: 'Forbidden',
          message: error.message || 'You do not have access to this workspace',
        },
        { status: 403 }
      );
    }

    if (error.error_type === 'NotFound') {
      return NextResponse.json(
        {
          status: 'error',
          code: 404,
          error_type: 'NotFound',
          message: error.message || 'Workspace not found',
        },
        { status: 404 }
      );
    }

    if (error.error_type === 'BadRequest') {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: error.message || 'Invalid request',
        },
        { status: 400 }
      );
    }

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
