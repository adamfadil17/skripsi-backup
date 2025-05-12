// app/actions/sendWorkspaceMessage.ts
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
      isDeleted: false, // New message is not deleted
      deletedAt: null, // New message has no delete date
      isEdited: false, // New message is not edited
      editedAt: null, // New message has no edit date
    };

    // Trigger Pusher event for new message
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
