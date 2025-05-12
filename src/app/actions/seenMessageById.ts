// app/actions/seenMessageById.ts
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

    // Find the conversation
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

    // Find the message
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

    // Update seenIds to include the user's ID
    const updatedMessage = await prisma.message.update({
      where: {
        id: messageId,
      },
      data: {
        // Add ID to seenIds array
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
    console.error('Error marking message as seen:', error);
    throw error;
  }
}
