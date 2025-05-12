// app/actions/updateMessageById.ts
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

    // Check if user is a member of the workspace
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

    // Find the message
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

    // Check if the user is the sender of the message
    if (message.senderId !== currentUser.id) {
      throw {
        error_type: 'Forbidden',
        message: 'You can only edit your own messages',
      };
    }

    // Check if the message is within the edit time window (2 minutes)
    const now = new Date();
    const messageTime = new Date(message.createdAt);
    const diffInMinutes = (now.getTime() - messageTime.getTime()) / (1000 * 60);

    if (diffInMinutes > 2) {
      throw {
        error_type: 'BadRequest',
        message: 'Edit time window expired (2 minutes)',
      };
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
      isEdited: updatedMessage.isEdited || false,
      editedAt: updatedMessage.editedAt || null,
      isDeleted: updatedMessage.isDeleted || false,
      deletedAt: updatedMessage.deletedAt || null,
    };

    // Trigger Pusher event for updated message
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
