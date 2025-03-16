import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

export async function GET(
  req: NextRequest,
  {
    params,
  }: { params: { workspaceId: string; documentId: string; contentId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const documentContent = await prisma.documentContent.findUnique({
      where: {
        id: params.contentId,
      },
      select: {
        content: true,
      },
    });

    if (!documentContent) {
      return new NextResponse('Not Found', { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Document content retrieved',
        data: documentContent.content,
      },
      { status: 200 }
    );
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * PUT: Menyimpan perubahan konten dokumen
 */
export async function PUT(
  req: NextRequest,
  {
    params,
  }: { params: { workspaceId: string; documentId: string; contentId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { content } = await req.json();

    // Jika ingin tetap menyimpan perubahan meskipun kosong
    const updatedContent = await prisma.documentContent.update({
      where: {
        id: params.contentId,
      },
      data: {
        content: content || '', // Simpan sebagai string kosong jika null/undefined
        editedAt: new Date(),
        editedById: currentUser.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Document content updated successfully',
        data: updatedContent,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
