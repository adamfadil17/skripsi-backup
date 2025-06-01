import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';
import type { ConversationMessage } from '@/types/types';

interface SendMessageInput {
  workspaceId: string;
  body?: string;
  image?: string;
}

export async function sendWorkspaceMessage(
  input: SendMessageInput,
  currentUser: User
) {
  try {
    if (!currentUser?.id || !currentUser?.email) {
      throw {
        error_type: 'Unauthorized',
        message: 'Unauthorized access',
      };
    }

    const { workspaceId, body: messageBody, image } = input;

    if (!workspaceId) {
      throw {
        error_type: 'BadRequest',
        message: 'Workspace ID is required',
      };
    }

    if (!messageBody && !image) {
      throw {
        error_type: 'BadRequest',
        message: 'Message body or image is required',
      };
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: currentUser.id,
      },
    });

    if (!membership) {
      throw {
        error_type: 'Forbidden',
        message: 'You do not have access to this workspace',
      };
    }

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

    const message = await prisma.message.create({
      data: {
        body: messageBody || '',
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

    await prisma.conversation.update({
      where: {
        id: conversation.id,
      },
      data: {
        lastMessageAt: new Date(),
      },
    });

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
      isDeleted: false,
      deletedAt: null,
      isEdited: false,
      editedAt: null,
    };

    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      'messages:new',
      conversationMessage
    );

    return conversationMessage;
  } catch (error) {
    console.error('Error sending workspace message:', error);
    throw error;
  }
}
