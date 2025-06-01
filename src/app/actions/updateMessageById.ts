import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';
import type { ConversationMessage } from '@/types/types';

export async function updateMessageById(
  workspaceId: string,
  messageId: string,
  messageBody: string,
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

    if (!messageBody) {
      throw {
        error_type: 'BadRequest',
        message: 'Message body is required',
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

    const message = await prisma.message.findUnique({
      where: {
        id: messageId,
      },
    });

    if (!message) {
      throw {
        error_type: 'NotFound',
        message: 'Message not found',
      };
    }

    if (message.senderId !== currentUser.id) {
      throw {
        error_type: 'Forbidden',
        message: 'You can only edit your own messages',
      };
    }

    const now = new Date();
    const messageTime = new Date(message.createdAt);
    const diffInMinutes = (now.getTime() - messageTime.getTime()) / (1000 * 60);

    if (diffInMinutes > 2) {
      throw {
        error_type: 'BadRequest',
        message: 'Edit time window expired (2 minutes)',
      };
    }

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
    console.error('Error updating message:', error);
    throw error;
  }
}
