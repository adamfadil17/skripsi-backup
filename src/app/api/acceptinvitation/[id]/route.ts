import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { acceptInvitation } from '@/app/actions/acceptInvitation';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    try {
      const result = await acceptInvitation(params.id, currentUser);

      return NextResponse.json({
        status: 'success',
        code: 200,
        message: 'Invitation accepted',
        data: {
          workspaceName: result.workspaceName,
          newMember: result.newMember,
        },
      });
    } catch (error: any) {
      if (error.error_type === 'NotFound') {
        return NextResponse.json(
          {
            status: 'error',
            code: 404,
            error_type: 'NotFound',
            message: error.message || 'Invitation not found or expired',
          },
          { status: 404 }
        );
      } else if (error.error_type === 'Forbidden') {
        return NextResponse.json(
          {
            status: 'error',
            code: 403,
            error_type: 'Forbidden',
            message: error.message || 'Forbidden: Email does not match the invitation',
          },
          { status: 403 }
        );
      } else if (error.error_type === 'UserIsMember') {
        return NextResponse.json(
          {
            status: 'error',
            code: 400,
            error_type: 'UserIsMember',
            message: error.message || 'You are already a member of this workspace',
          },
          { status: 400 }
        );
      } else if (error.error_type === 'InvitationExpired') {
        return NextResponse.json(
          {
            status: 'error',
            code: 400,
            error_type: 'InvitationExpired',
            message: error.message || 'Invitation expired',
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
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error accepting invitation:', error);
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