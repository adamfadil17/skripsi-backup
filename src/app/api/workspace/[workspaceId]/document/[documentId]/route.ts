// src/app/api/workspaces/[id]/documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDocumentInfo } from '@/app/actions/getDocumentInfo';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import prisma from '@/lib/prismadb';

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

    const document = await getDocumentInfo(workspaceId, documentId);

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

    const document = await prisma.document.findUnique({
      where: { id: documentId, workspaceId: workspaceId },
    });

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

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        title,
        emoji,
        coverImage,
      },
    });

    return NextResponse.json(
      {
        status: 'success',
        code: 200,
        message: 'Document updated successfully',
        data: { updatedDocument },
      },
      { status: 200 }
    );
  } catch (error) {
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

    const document = await prisma.document.findUnique({
      where: { id: documentId, workspaceId: workspaceId },
      include: { workspace: true },
    });

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

    const deletedDocument = await prisma.document.delete({
      where: { id: documentId },
    });

    return NextResponse.json(
      {
        status: 'success',
        code: 200,
        message: 'Document deleted successfully',
        data: { deletedDocument },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete document error:', error);
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
