import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import prisma from '@/lib/prismadb';
import { pusherServer } from '@/lib/pusher';
import type { ConversationMessage } from '@/types/types';

export async function PUT(
  request: Request,
  { params }: { params: { workspaceId: string; messageId: string } }
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

    const { workspaceId, messageId } = params;
    if (!workspaceId || !messageId) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Workspace ID and Message ID are required',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { body: messageBody } = body;

    // Check if user is a member of the workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: {
          email: currentUser.email,
        },
      },
    });

    if (!membership) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Find the message
    const message = await prisma.message.findUnique({
      where: {
        id: messageId,
      },
    });

    if (!message) {
      return new NextResponse('Message not found', { status: 404 });
    }

    // Check if the user is the sender of the message
    if (message.senderId !== currentUser.id) {
      return new NextResponse('Forbidden - Not message owner', { status: 403 });
    }

    // Check if the message is within the edit time window (2 minutes)
    const now = new Date();
    const messageTime = new Date(message.createdAt);
    const diffInMinutes = (now.getTime() - messageTime.getTime()) / (1000 * 60);

    if (diffInMinutes > 2) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Edit time window expired (2 minutes)',
        },
        { status: 400 }
      );
    }

    // Update the message
    const updatedMessage = await prisma.message.update({
      where: {
        id: messageId,
      },
      data: {
        body: messageBody,
        isEdited: true,
        editedAt: now,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        seenBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Convert to ConversationMessage type
    const conversationMessage: ConversationMessage = {
      id: updatedMessage.id,
      body: updatedMessage.body,
      image: updatedMessage.image,
      conversationId: updatedMessage.conversationId,
      senderId: updatedMessage.senderId,
      createdAt: updatedMessage.createdAt,
      seenIds: updatedMessage.seenIds,
      seenBy: updatedMessage.seenBy,
      sender: updatedMessage.sender,
      isEdited: updatedMessage.isEdited,
      editedAt: updatedMessage.editedAt,
    };

    // Trigger Pusher event for updated message
    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      'messages:update',
      conversationMessage
    );

    return NextResponse.json(conversationMessage);
  } catch (error) {
    console.error('EDIT MESSAGE ERROR:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { workspaceId: string; messageId: string } }
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

    const { workspaceId, messageId } = params;
    if (!workspaceId || !messageId) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Workspace ID and Message ID are required',
        },
        { status: 400 }
      );
    }

    // Check if user is a member of the workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: {
          email: currentUser.email,
        },
      },
    });

    if (!membership) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Find the message
    const message = await prisma.message.findUnique({
      where: {
        id: messageId,
      },
    });

    if (!message) {
      return new NextResponse('Message not found', { status: 404 });
    }

    // Check if the user is the sender of the message or an admin
    const isAdmin =
      membership.role === 'SUPER_ADMIN' || membership.role === 'ADMIN';
    if (message.senderId !== currentUser.id && !isAdmin) {
      return new NextResponse('Forbidden - Not message owner or admin', {
        status: 403,
      });
    }

    // Soft delete the message
    const now = new Date();
    const deletedMessage = await prisma.message.update({
      where: {
        id: messageId,
      },
      data: {
        isDeleted: true,
        deletedAt: now,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        seenBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Convert to ConversationMessage type
    const conversationMessage: ConversationMessage = {
      id: deletedMessage.id,
      body: deletedMessage.body,
      image: deletedMessage.image,
      conversationId: deletedMessage.conversationId,
      senderId: deletedMessage.senderId,
      createdAt: deletedMessage.createdAt,
      seenIds: deletedMessage.seenIds,
      seenBy: deletedMessage.seenBy,
      sender: deletedMessage.sender,
      isEdited: deletedMessage.isEdited,
      editedAt: deletedMessage.editedAt,
      isDeleted: deletedMessage.isDeleted,
      deletedAt: deletedMessage.deletedAt,
    };

    // Trigger Pusher event for updated message
    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      'messages:update',
      conversationMessage
    );

    return NextResponse.json(conversationMessage);
  } catch (error) {
    console.error('DELETE MESSAGE ERROR:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
