import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

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

    const documentContent = await prisma.documentContent.findFirst({
      where: { documentId: params.documentId },
      select: { content: true },
    });

    if (!documentContent) {
      return NextResponse.json(
        {
          status: 'error',
          code: 404,
          error_type: 'NotFound',
          message: 'Document content not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        status: 'success',
        code: 200,
        message: 'Document content retrieved successfully',
        data: { content: documentContent.content },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching document content:', error);
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

export async function PUT(
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

    const body = await req.json();
    if (!body?.content) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Content is required',
        },
        { status: 400 }
      );
    }

    const safeContent = body.content ?? {}; // Pastikan konten tidak null/undefined

    // Cek apakah dokumen sudah ada di database
    const existingContent = await prisma.documentContent.findFirst({
      where: { documentId: params.documentId },
    });

    let updatedContent;
    if (existingContent) {
      // Jika sudah ada, lakukan update
      updatedContent = await prisma.documentContent.update({
        where: { id: existingContent.id },
        data: {
          content: safeContent,
          editedAt: new Date(),
          editedById: currentUser.id,
        },
      });
    } else {
      // Jika belum ada, buat entry baru
      updatedContent = await prisma.documentContent.create({
        data: {
          documentId: params.documentId,
          content: safeContent,
          editedAt: new Date(),
          editedById: currentUser.id,
        },
      });
    }

    return NextResponse.json(
      {
        status: 'success',
        code: 200,
        message: 'Document content updated successfully',
        data: { updatedContent },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating document content:', error);
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
