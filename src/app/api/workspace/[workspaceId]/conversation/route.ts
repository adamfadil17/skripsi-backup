import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import prisma from '@/lib/prismadb';

import type { WorkspaceConversation } from '@/types/types';

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
    let conversation = await prisma.conversation.findUnique({
      where: {
        workspaceId,
      },
      include: {
        messages: {
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
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          workspaceId,
        },
        include: {
          messages: {
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
          },
        },
      });
    }

    // Convert to WorkspaceConversation type
    const workspaceConversation: WorkspaceConversation = {
      id: conversation.id,
      workspaceId: conversation.workspaceId,
      lastMessageAt: conversation.lastMessageAt,
      messages: conversation.messages.map((message) => ({
        id: message.id,
        // Replace body for deleted messages
        body: message.isDeleted
          ? 'This message has been deleted'
          : message.body,
        image: message.image,
        conversationId: message.conversationId,
        senderId: message.senderId,
        createdAt: message.createdAt,
        seenIds: message.seenIds,
        seenBy: message.seenBy,
        sender: message.sender,
        // Include these important properties
        isDeleted: message.isDeleted || false,
        deletedAt: message.deletedAt || null,
        isEdited: message.isEdited || false,
        editedAt: message.editedAt || null,
      })),
    };

    return NextResponse.json(workspaceConversation);
  } catch (error) {
    console.error('GET CONVERSATION ERROR:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
