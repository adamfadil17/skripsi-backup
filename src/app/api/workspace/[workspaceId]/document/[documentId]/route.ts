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
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, documentId } = params;

    if (!workspaceId || !documentId) {
      return NextResponse.json(
        { message: 'workspaceId and documentId are required' },
        { status: 400 }
      );
    }

    const document = await getDocumentInfo(workspaceId, documentId);

    return NextResponse.json({ success: true, document }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching document', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
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
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, documentId } = params;
    const { title, emoji, coverImage } = await req.json();

    const document = await prisma.document.findUnique({
      where: { id: documentId, workspaceId: workspaceId },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Document not found' },
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
        success: true,
        message: 'Document updated successfully',
        updatedDocument,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal Server Error' },
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
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { workspaceId, documentId } = params;

    const document = await prisma.document.findUnique({
      where: { id: documentId, workspaceId: workspaceId },
      include: { workspace: true },
    });

    if (!document) {
      return NextResponse.json(
        { message: 'Document not found' },
        { status: 404 }
      );
    }

    const deletedDocument = await prisma.document.delete({
      where: { id: documentId },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Document deleted successfully',
        deletedDocument,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
