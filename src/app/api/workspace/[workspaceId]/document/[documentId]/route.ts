// app/api/workspaces/[workspaceId]/documents/[documentId]/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { getDocumentById } from '@/app/actions/getDocumentById';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { updateDocumentById } from '@/app/actions/updateDocumentById';
import { deleteDocumentById } from '@/app/actions/deleteDocumentById';

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceId: string; documentId: string } }
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

    const { workspaceId, documentId } = params;

    if (!workspaceId || !documentId) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'workspaceId and documentId are required',
        },
        { status: 400 }
      );
    }

    const document = await getDocumentById(workspaceId, documentId);

    if (!document) {
      return NextResponse.json(
        {
          status: 'error',
          code: 404,
          error_type: 'NotFound',
          message: 'Document not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { status: 'success', code: 200, data: { document } },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching document', error);
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { workspaceId: string; documentId: string } }
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

    const { workspaceId, documentId } = params;
    if (!workspaceId || !documentId) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'workspaceId and documentId are required',
        },
        { status: 400 }
      );
    }

    const { title, emoji, coverImage } = await req.json();

    const result = await updateDocumentById(
      workspaceId,
      documentId,
      { title, emoji, coverImage },
      currentUser
    );

    // Handle "no changes" case
    if (result.noChanges) {
      return NextResponse.json(
        {
          status: 'success',
          code: 200,
          message: 'No changes to update',
          data: { document: result.document },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        status: 'success',
        code: 200,
        message: 'Document updated successfully',
        data: { updatedDocument: result.updatedDocument },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating document:', error);

    // Handle specific error types
    if (error.error_type === 'Forbidden') {
      return NextResponse.json(
        {
          status: 'error',
          code: 403,
          error_type: 'Forbidden',
          message:
            error.message ||
            'You do not have permission to update this document',
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
          message: error.message || 'Document not found',
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
          message: error.message || 'Invalid request parameters',
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
  req: NextRequest,
  { params }: { params: { workspaceId: string; documentId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser?.email)
      return NextResponse.json(
        {
          status: 'error',
          code: 401,
          error_type: 'Unauthorized',
          message: 'Unauthorized access',
        },
        { status: 401 }
      );

    const { workspaceId, documentId } = params;
    if (!workspaceId || !documentId) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'workspaceId and documentId are required',
        },
        { status: 400 }
      );
    }

    const deletedDocument = await deleteDocumentById(
      workspaceId,
      documentId,
      currentUser
    );

    return NextResponse.json(
      {
        status: 'success',
        code: 200,
        message: 'Document deleted successfully',
        data: { deletedDocument },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete document error:', error);

    // Handle specific error types
    if (error.error_type === 'Forbidden') {
      return NextResponse.json(
        {
          status: 'error',
          code: 403,
          error_type: 'Forbidden',
          message:
            error.message ||
            'You do not have permission to delete this document',
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
          message: error.message || 'Document not found',
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
          message: error.message || 'Invalid request parameters',
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
