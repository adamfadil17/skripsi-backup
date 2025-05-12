// app/actions/getWorkspaceMessages.ts
import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';
import type { ConversationMessage } from '@/types/types';

export async function getWorkspaceMessages(
  workspaceId: string,
  currentUser: User
) {
  try {
    if (!currentUser?.id || !currentUser?.email) {
      throw {
        error_type: 'Unauthorized',
        message: 'Unauthorized access',
      };
    }

    if (!workspaceId) {
      throw {
        error_type: 'BadRequest',
        message: 'Workspace ID is required',
      };
    }

    // Check if user is a member of the workspace and get join date
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: currentUser.id,
      },
      select: {
        joinedAt: true,
      },
    });

    if (!membership) {
      throw {
        error_type: 'Forbidden',
        message: 'You do not have access to this workspace',
      };
    }

    // Get user join date
    const userJoinDate = membership.joinedAt;

    // Find conversation for the workspace
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

    // Get messages for the conversation
    // All members only see messages after they joined
    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        createdAt: { gte: userJoinDate }, // Filter messages based on user join date
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
        isDeleted: message.isDeleted || false,
        deletedAt: message.deletedAt || null,
        isEdited: message.isEdited || false,
        editedAt: message.editedAt || null,
      })
    );

    return conversationMessages;
  } catch (error) {
    console.error('Error getting workspace messages:', error);
    throw error;
  }
}
