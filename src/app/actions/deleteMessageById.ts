import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';
import type { ConversationMessage } from '@/types/types';

export async function deleteMessageById(
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
        message: 'You can only delete your own messages',
      };
    }

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

    const conversationMessage: ConversationMessage = {
      id: deletedMessage.id,
      body: 'This message has been deleted',
      image: deletedMessage.image,
      conversationId: deletedMessage.conversationId,
      senderId: deletedMessage.senderId,
      createdAt: deletedMessage.createdAt,
      seenIds: deletedMessage.seenIds,
      seenBy: deletedMessage.seenBy,
      sender: deletedMessage.sender,
      isEdited: deletedMessage.isEdited || false,
      editedAt: deletedMessage.editedAt || null,
      isDeleted: deletedMessage.isDeleted || false,
      deletedAt: deletedMessage.deletedAt || null,
    };

    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      'messages:update',
      conversationMessage
    );

    return conversationMessage;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}
