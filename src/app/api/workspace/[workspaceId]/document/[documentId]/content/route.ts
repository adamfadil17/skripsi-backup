import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { pusherServer } from '@/lib/pusher'; // Import the Pusher server instance

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceId: string; documentId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser.id || !currentUser?.email) {
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

    // Get the latest document content
    const documentContent = await prisma.documentContent.findFirst({
      where: { documentId: params.documentId },
      orderBy: { editedAt: 'desc' }, // Ensure we get the most recent version
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

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { title: true },
    });

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

    const safeContent = body.content ?? {}; // Ensure content is not null/undefined
    const editorEmail = body.userEmail || currentUser.email; // Get the editor email instead of ID

    // Find the user by email to get their ID for the database
    const user = await prisma.user.findUnique({
      where: { email: currentUser.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        {
          status: 'error',
          code: 404,
          error_type: 'NotFound',
          message: 'User not found',
        },
        { status: 404 }
      );
    }

    // Check if document already exists in database
    const existingContent = await prisma.documentContent.findFirst({
      where: { documentId: params.documentId },
    });

    let updatedContent;
    if (existingContent) {
      // If it exists, update it
      updatedContent = await prisma.documentContent.update({
        where: { id: existingContent.id },
        data: {
          content: safeContent,
          editedAt: new Date(),
          editedById: user.id, // Use the user ID from the database
        },
      });
    } else {
      // If it doesn't exist, create a new entry
      updatedContent = await prisma.documentContent.create({
        data: {
          documentId: params.documentId,
          content: safeContent,
          editedAt: new Date(),
          editedById: user.id, // Use the user ID from the database
        },
      });
    }

    // Update the document's updatedBy field
    await prisma.document.update({
      where: { id: documentId },
      data: {
        updatedById: user.id, // Use the user ID from the database
        updatedAt: new Date(),
      },
    });

    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      'document-content-updated',
      {
        documentId,
        content: safeContent,
        editorEmail, // Include the editor's email to prevent update loops
        timestamp: new Date().toISOString(),
        documentName: document?.title,
        // editorName: currentUser.name,
        editedBy: {
          id: currentUser.id,
          name: currentUser.name,
          image: currentUser.image,
        }, // Optional: include editor name for UI display
      }
    );

    await pusherServer.trigger(
      `notification-${workspaceId}`,
      'document-content-updated',
      {
        documentId,
        content: safeContent,
        editorEmail, // Include the editor's email to prevent update loops
        timestamp: new Date().toISOString(),
        documentName: document?.title,
        editedBy: {
          id: currentUser.id,
          name: currentUser.name,
          image: currentUser.image,
        }, // Optional: include editor name for UI display
      }
    );

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
