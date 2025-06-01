import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { updateMemberRoleById } from '@/app/actions/updateMemberRoleById';
import { deleteMemberById } from '@/app/actions/deleteMemberById';

export async function PUT(
  req: NextRequest,
  { params }: { params: { workspaceId: string; userId: string } }
) {
  try {
    const { newRole } = await req.json();
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

    const workspaceId = params.workspaceId;
    const userId = params.userId;

    try {
      const updatedMember = await updateMemberRoleById({
        userId,
        workspaceId,
        newRole,
        currentUser,
      });

      return NextResponse.json(
        {
          status: 'success',
          code: 200,
          message: 'Role updated successfully',
          data: { member: updatedMember },
        },
        { status: 200 }
      );
    } catch (error: any) {
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
      } else if (error.error_type === 'Unauthorized') {
        return NextResponse.json(
          {
            status: 'error',
            code: 401,
            error_type: 'Unauthorized',
            message: error.message || 'Unauthorized access',
          },
          { status: 401 }
        );
      } else if (error.error_type === 'Forbidden') {
        return NextResponse.json(
          {
            status: 'error',
            code: 403,
            error_type: 'Forbidden',
            message: error.message || 'Access forbidden',
          },
          { status: 403 }
        );
      } else if (error.error_type === 'NotFound') {
        return NextResponse.json(
          {
            status: 'error',
            code: 404,
            error_type: 'NotFound',
            message: error.message || 'Resource not found',
          },
          { status: 404 }
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error updating member role:', error);
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
  { params }: { params: { workspaceId: string; userId: string } }
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

    const { workspaceId, userId } = params;

    try {
      const result = await deleteMemberById({
        userId,
        workspaceId,
        currentUser,
      });

      return NextResponse.json(
        {
          status: 'success',
          code: 200,
          message: result.message || 'Member removed successfully.',
        },
        { status: 200 }
      );
    } catch (error: any) {
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
      } else if (error.error_type === 'Unauthorized') {
        return NextResponse.json(
          {
            status: 'error',
            code: 401,
            error_type: 'Unauthorized',
            message: error.message || 'Unauthorized access',
          },
          { status: 401 }
        );
      } else if (error.error_type === 'Forbidden') {
        return NextResponse.json(
          {
            status: 'error',
            code: 403,
            error_type: 'Forbidden',
            message: error.message || 'Access forbidden',
          },
          { status: 403 }
        );
      } else if (error.error_type === 'NotFound') {
        return NextResponse.json(
          {
            status: 'error',
            code: 404,
            error_type: 'NotFound',
            message: error.message || 'Resource not found',
          },
          { status: 404 }
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error removing member:', error);
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
