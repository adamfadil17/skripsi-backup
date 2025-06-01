import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { getWorkspaceMessages } from '@/app/actions/getWorkspaceMessages';
import { sendWorkspaceMessage } from '@/app/actions/sendWorkspaceMessage';

export async function GET(
  request: NextRequest,
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

    const messages = await getWorkspaceMessages(workspaceId, currentUser);

    if (!messages) {
      return NextResponse.json(
        {
          status: 'error',
          code: 404,
          error_type: 'NotFound',
          message: 'Messages not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        status: 'success',
        code: 200,
        message: 'Messages fetched successfully',
        data: { messages },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching workspace messages:', error);

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
  request: NextRequest,
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

    const body = await request.json();
    const { body: messageBody, image } = body;

    if (!messageBody && !image) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Message body or image is required',
        },
        { status: 400 }
      );
    }

    const message = await sendWorkspaceMessage(
      {
        workspaceId,
        body: messageBody,
        image,
      },
      currentUser
    );

    return NextResponse.json(
      {
        status: 'success',
        code: 201,
        message: 'Message sent successfully',
        data: { message },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error sending workspace message:', error);

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
