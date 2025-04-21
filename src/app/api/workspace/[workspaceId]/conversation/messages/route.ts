import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import prisma from '@/lib/prismadb';
import { pusherServer } from '@/lib/pusher';
import type { ConversationMessage } from '@/types/types';

export async function GET(
  request: NextRequest,
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

    // Find or create conversation for the workspace
    const conversation = await prisma.conversation.findUnique({
      where: {
        workspaceId,
      },
    });

    if (!conversation) {
      return new NextResponse('Conversation not found', { status: 404 });
    }

    // Get messages for the conversation
    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversation.id,
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
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Convert to ConversationMessage type
    const conversationMessages: ConversationMessage[] = messages.map(
      (message) => ({
        id: message.id,
        body: message.body,
        image: message.image,
        conversationId: message.conversationId,
        senderId: message.senderId,
        createdAt: message.createdAt,
        seenIds: message.seenIds,
        seenBy: message.seenBy,
        sender: message.sender,
      })
    );

    return NextResponse.json(conversationMessages);
  } catch (error) {
    console.error('GET MESSAGES ERROR:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
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
    const { body: messageBody, image } = body;

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

    // Find or create conversation for the workspace
    let conversation = await prisma.conversation.findUnique({
      where: {
        workspaceId,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          workspaceId,
        },
      });
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        body: messageBody,
        image,
        conversation: {
          connect: {
            id: conversation.id,
          },
        },
        sender: {
          connect: {
            id: currentUser.id,
          },
        },
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

    // Update the conversation's lastMessageAt
    await prisma.conversation.update({
      where: {
        id: conversation.id,
      },
      data: {
        lastMessageAt: new Date(),
      },
    });

    // Convert to ConversationMessage type
    const conversationMessage: ConversationMessage = {
      id: message.id,
      body: message.body,
      image: message.image,
      conversationId: message.conversationId,
      senderId: message.senderId,
      createdAt: message.createdAt,
      seenIds: message.seenIds,
      seenBy: message.seenBy,
      sender: message.sender,
    };

    // Trigger Pusher event for new message
    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      'messages:new',
      conversationMessage
    );

    return NextResponse.json(conversationMessage);
  } catch (error) {
    console.error('POST MESSAGE ERROR:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
