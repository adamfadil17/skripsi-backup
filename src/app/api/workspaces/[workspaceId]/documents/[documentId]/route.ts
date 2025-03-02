// src/app/api/workspaces/[id]/documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById } from '@/app/actions/getDocumentById';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import prisma from '@/lib/prismadb';

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceId: string; documentId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser?.email) {
      throw new Error('Unauthorized');
    }
    const { workspaceId, documentId } = params;

    if (!workspaceId || !documentId) {
      return NextResponse.json(
        { error: 'workspaceId and documentId are required' },
        { status: 400 }
      );
    }

    const document = await getDocumentById(workspaceId, documentId);

    return NextResponse.json({ success: true, document }, { status: 200 });
  } catch (error: any) {
    console.error('Error in GET /api/workspaces/[id]/documents/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
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
      throw new Error('Unauthorized');
    }

    const { workspaceId, documentId } = params;

    if (!workspaceId || !documentId) {
      return NextResponse.json(
        { error: 'workspaceId and documentId are required' },
        { status: 400 }
      );
    }

    // Validate that the document exists and belongs to the workspace
    const existingDocument = await prisma.document.findUnique({
      where: {
        id: documentId,
        workspaceId: workspaceId,
      },
    });

    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Parse the request body
    const body = await req.json();
    const { title, emoji, coverImage } = body;

    // Update only the fields that are provided
    const updateData: any = {};

    if (title !== undefined) {
      updateData.title = title;
    }

    if (emoji !== undefined) {
      updateData.emoji = emoji;
    }

    if (coverImage !== undefined) {
      updateData.coverImage = coverImage;
    }

    // Add the updatedById field
    updateData.updatedById = currentUser.id;

    // Update the document
    const updatedDocument = await prisma.document.update({
      where: {
        id: documentId,
      },
      data: updateData,
    });

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error('[DOCUMENT_PATCH]', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 500 }
      );
    }
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
