import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceId: string; documentId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const documentContent = await prisma.documentContent.findFirst({
      where: { documentId: params.documentId },
      select: { content: true },
    });

    if (!documentContent) {
      return NextResponse.json(
        { success: false, message: 'Document content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Document content retrieved successfully',
      data: {
        content: documentContent.content,
      },
    });
  } catch (error) {
    console.error('Error fetching document content:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
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
    if (!currentUser?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
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

    return NextResponse.json({
      success: true,
      message: 'Document content updated successfully',
      data: updatedContent,
    });
  } catch (error) {
    console.error('Error updating document content:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
