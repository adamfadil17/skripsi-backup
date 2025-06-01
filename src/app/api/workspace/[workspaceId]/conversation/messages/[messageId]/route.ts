import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { updateMessageById } from '@/app/actions/updateMessageById';
import { deleteMessageById } from '@/app/actions/deleteMessageById';

export async function PUT(
  request: NextRequest,
  { params }: { params: { workspaceId: string; messageId: string } }
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

    const { workspaceId, messageId } = params;
    if (!workspaceId || !messageId) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Workspace ID and Message ID are required',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { body: messageBody } = body;

    if (!messageBody) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Message body is required',
        },
        { status: 400 }
      );
    }

    const updatedMessage = await updateMessageById(
      workspaceId,
      messageId,
      messageBody,
      currentUser
    );

    return NextResponse.json(
      {
        status: 'success',
        code: 200,
        message: 'Message updated successfully',
        data: { message: updatedMessage },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating message:', error);

    if (error.error_type === 'Forbidden') {
      return NextResponse.json(
        {
          status: 'error',
          code: 403,
          error_type: 'Forbidden',
          message:
            error.message ||
            'You do not have permission to update this message',
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
          message: error.message || 'Message not found',
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
          message: error.message || 'Bad request',
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { workspaceId: string; messageId: string } }
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

    const { workspaceId, messageId } = params;
    if (!workspaceId || !messageId) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Workspace ID and Message ID are required',
        },
        { status: 400 }
      );
    }

    const deletedMessage = await deleteMessageById(
      workspaceId,
      messageId,
      currentUser
    );

    return NextResponse.json(
      {
        status: 'success',
        code: 200,
        message: 'Message deleted successfully',
        data: { message: deletedMessage },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting message:', error);

    if (error.error_type === 'Forbidden') {
      return NextResponse.json(
        {
          status: 'error',
          code: 403,
          error_type: 'Forbidden',
          message:
            error.message ||
            'You do not have permission to delete this message',
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
          message: error.message || 'Message not found',
        },
        { status: 404 }
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
