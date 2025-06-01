import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import prisma from '@/lib/prismadb';
import { pusherServer } from '@/lib/pusher';
import { deleteInvitationById } from '@/app/actions/deleteInvitationById';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { workspaceId: string; invitationId: string } }
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

    const { workspaceId, invitationId } = params;

    if (!workspaceId || !invitationId) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'workspaceId and invitationId are required',
        },
        { status: 400 }
      );
    }

    try {
      const result = await deleteInvitationById({
        invitationId,
        workspaceId,
        currentUser,
      });

      return NextResponse.json(
        {
          status: 'success',
          code: 200,
          message: result.message,
          data: { deletedInvitation: result.deletedInvitation },
        },
        { status: 200 }
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
      } else if (error.error_type === 'NotFound') {
        return NextResponse.json(
          {
            status: 'error',
            code: 404,
            error_type: error.error_type,
            message: error.message || 'Resource not found',
          },
          { status: 404 }
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error deleting invitation:', error);
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
