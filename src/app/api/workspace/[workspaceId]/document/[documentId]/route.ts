import { type NextRequest, NextResponse } from 'next/server';
import { getDocumentInfo } from '@/app/actions/getDocumentInfo';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import prisma from '@/lib/prismadb';
import { pusherServer } from '@/lib/pusher';

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

    // Prepare update data before checking for changes
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (emoji !== undefined) updateData.emoji = emoji;
    if (coverImage !== undefined) updateData.coverImage = coverImage;

    // Add updatedById if there's any update to be made
    if (Object.keys(updateData).length > 0) {
      updateData.updatedById = currentUser.id;
    }

    // Check if there are actual changes to make
    const hasChanges =
      (title !== undefined && title !== document.title) ||
      (emoji !== undefined && emoji !== document.emoji) ||
      (coverImage !== undefined && coverImage !== document.coverImage);

    // Log what's happening
    console.log('Document update requested:', {
      current: {
        title: document.title,
        emoji: document.emoji,
        coverImage: document.coverImage,
      },
      requested: { title, emoji, coverImage },
      hasChanges,
      updateData,
    });

    // Only proceed with update if there are changes to make
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          status: 'success',
          code: 200,
          message: 'No changes to update',
          data: { document },
        },
        { status: 200 }
      );
    }

    // Proceed with update
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Only create notification and trigger Pusher events if there were actual changes
    if (hasChanges) {
      // Create notification for document update
      await prisma.notification.create({
        data: {
          workspaceId,
          message: `${currentUser.name} updated document information of "${updatedDocument.title}"`,
          type: 'DOCUMENT_UPDATE',
          userId: currentUser.id,
          documentId: documentId,
        },
      });

      // Trigger Pusher event for real-time updates
      await pusherServer.trigger(
        `workspace-${workspaceId}`,
        'document-updated',
        {
          id: updatedDocument.id,
          title: updatedDocument.title,
          emoji: updatedDocument.emoji,
          coverImage: updatedDocument.coverImage,
          createdAt: updatedDocument.createdAt,
          createdBy: updatedDocument.createdBy,
          updatedBy: updatedDocument.updatedBy,
        }
      );

      await pusherServer.trigger(
        `notification-${workspaceId}`,
        'document-updated',
        {
          id: updatedDocument.id,
          title: updatedDocument.title,
          emoji: updatedDocument.emoji,
          coverImage: updatedDocument.coverImage,
          updatedBy: {
            id: updatedDocument.updatedBy?.id,
            name: updatedDocument.updatedBy?.name,
            image: updatedDocument.updatedBy?.image,
          },
        }
      );
    }

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
    console.error('Error updating document:', error);
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

    // Store document title before deletion for notification
    const documentTitle = document.title;

    const [deletedDocument] = await prisma.$transaction([
      prisma.document.delete({ where: { id: documentId } }),
      prisma.notification.create({
        data: {
          workspaceId,
          userId: currentUser.id,
          type: 'DOCUMENT_DELETE',
          message: `${currentUser.name} deleted document "${documentTitle}"`,
        },
      }),
    ]);

    // Trigger Pusher event for real-time updates
    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      'document-removed',
      documentId
    );

    await pusherServer.trigger(
      `notification-${workspaceId}`,
      'document-removed',
      {
        id: documentId,
        title: documentTitle,
        deletedBy: {
          id: currentUser.id,
          name: currentUser.name,
          image: currentUser.image || null,
        },
      }
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
