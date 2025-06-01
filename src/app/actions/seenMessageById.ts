import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';
import type { ConversationMessage } from '@/types/types';

export async function seenMessageById(
  workspaceId: string,
  messageId: string,
  currentUser: User
) {
  try {
    if (!currentUser?.id || !currentUser?.email) {
      throw {
        error_type: 'Unauthorized',
        message: 'Unauthorized access',
      };
    }

    if (!workspaceId || !messageId) {
      throw {
        error_type: 'BadRequest',
        message: 'Workspace ID and Message ID are required',
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

    const conversation = await prisma.conversation.findUnique({
      where: {
        workspaceId,
      },
    });

    if (!conversation) {
      throw {
        error_type: 'NotFound',
        message: 'Conversation not found',
      };
    }

    const message = await prisma.message.findUnique({
      where: {
        id: messageId,
      },
    });

    if (!message || message.conversationId !== conversation.id) {
      throw {
        error_type: 'NotFound',
        message: 'Message not found',
      };
    }

    const updatedMessage = await prisma.message.update({
      where: {
        id: messageId,
      },
      data: {
        seenIds: {
          push: currentUser.id,
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
      isEdited: updatedMessage.isEdited || false,
      editedAt: updatedMessage.editedAt || null,
      isDeleted: updatedMessage.isDeleted || false,
      deletedAt: updatedMessage.deletedAt || null,
    };

    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      'messages:update',
      conversationMessage
    );

    return conversationMessage;
  } catch (error) {
    console.error('Error marking message as seen:', error);
    throw error;
  }
}
