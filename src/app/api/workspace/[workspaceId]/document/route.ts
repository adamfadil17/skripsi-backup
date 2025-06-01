import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { getWorkspaceDocuments } from '@/app/actions/getWorkspaceDocuments';
import { createDocument } from '@/app/actions/createDocument';

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

    const documents = await getWorkspaceDocuments(workspaceId, currentUser);

    if (!documents) {
      return NextResponse.json(
        {
          status: 'error',
          code: 403,
          error_type: 'Forbidden',
          message: 'You do not have access to this workspace',
        },
        { status: 403 }
      );
    }

    if (documents.length === 0) {
      return NextResponse.json(
        {
          status: 'success',
          code: 200,
          message: 'No documents found in this workspace',
          data: { documents: [] },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        status: 'success',
        code: 200,
        message: 'Documents fetched successfully',
        data: { documents },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      'Error in GET /api/workspaces/[workspaceId]/documents:',
      error
    );
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

    const body = await req.json();
    const { title, emoji, coverImage } = body;

    if (!title || !emoji || !coverImage) {
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

    const newDocument = await createDocument(
      workspaceId,
      { title, emoji, coverImage },
      currentUser
    );

    return NextResponse.json(
      {
        status: 'success',
        code: 201,
        message: 'Document created successfully',
        data: { newDocument },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating document:', error);

    if (error.error_type === 'Forbidden') {
      return NextResponse.json(
        {
          status: 'error',
          code: 403,
          error_type: 'Forbidden',
          message:
            error.message ||
            'You do not have permission to create a document in this workspace',
        },
        { status: 403 }
      );
    }

    if (error.error_type === 'BadRequest') {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: error.message || 'Invalid request parameters',
        },
        { status: 400 }
      );
    }

    if (error.error_type === 'Unauthorized') {
      return NextResponse.json(
        {
          status: 'error',
          code: 401,
          error_type: 'Unauthorized',
          message: error.message || 'Unauthorized access',
        },
        { status: 401 }
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
