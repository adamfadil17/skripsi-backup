import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import prisma from '@/lib/prismadb';
import { pusherServer } from '@/lib/pusher';
import type { ConversationMessage } from '@/types/types';

export async function POST(
  request: Request,
  { params }: { params: { workspaceId: string } }
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

    const { workspaceId } = params;
    if (!workspaceId) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Workspace ID is required',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { messageId } = body;

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

    // Find the conversation
    const conversation = await prisma.conversation.findUnique({
      where: {
        workspaceId,
      },
    });

    if (!conversation) {
      return new NextResponse('Conversation not found', { status: 404 });
    }

    // Find the message
    const message = await prisma.message.findUnique({
      where: {
        id: messageId,
      },
    });

    if (!message || message.conversationId !== conversation.id) {
      return new NextResponse('Message not found', { status: 404 });
    }

    // FIX: Update seenIds to include the user's email (not just ID)
    // This is the most critical fix - ensuring consistency between what's stored and what's checked
    const updatedMessage = await prisma.message.update({
      where: {
        id: messageId,
      },
      data: {
        // Add email to seenIds array
        seenIds: {
          push: currentUser.id,
        },
        // Also maintain the seenBy relationship
        seenBy: {
          connect: {
            id: currentUser.id,
          },
        },
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
    };

    // Trigger Pusher event for updated message
    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      'messages:update',
      conversationMessage
    );

    return NextResponse.json(conversationMessage);
  } catch (error) {
    console.error('SEEN MESSAGE ERROR:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
