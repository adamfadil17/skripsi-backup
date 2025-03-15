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
      throw new Error('Unauthorized');
    }
    const { workspaceId, documentId } = params;

    if (!workspaceId || !documentId) {
      return NextResponse.json(
        { error: 'workspaceId and documentId are required' },
        { status: 400 }
      );
    }

    const document = await getDocumentInfo(workspaceId, documentId);

    return NextResponse.json({ success: true, document }, { status: 200 });
  } catch (error: any) {
    console.error(
      'Error in GET /api/workspace/[workspacId]/document/[documentId]:',
      error
    );
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
    const { documentId } = params;
    const { title, emoji, coverImage } = await req.json();

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        title,
        emoji,
        coverImage,
      },
    });

    return NextResponse.json(updatedDocument);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const document = await prisma.document.findUnique({
      where: { id: params.documentId },
      include: { workspace: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const deletedDocument = await prisma.document.delete({
      where: { id: params.documentId },
    });

    return NextResponse.json(deletedDocument, { status: 200 });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
