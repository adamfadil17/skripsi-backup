import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';
import type { WorkspaceConversation } from '@/types/types';

export async function getWorkspaceConversations(
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

    const userJoinDate = membership.joinedAt;

    let conversation = await prisma.conversation.findUnique({
      where: {
        workspaceId,
      },
      include: {
        messages: {
          where: {
            createdAt: { gte: userJoinDate },
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
            where: {
              createdAt: { gte: userJoinDate },
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
          },
        },
      });
    }

    const workspaceConversation: WorkspaceConversation = {
      id: conversation.id,
      workspaceId: conversation.workspaceId,
      lastMessageAt: conversation.lastMessageAt,
      messages: conversation.messages.map((message) => ({
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
      })),
    };

    return workspaceConversation;
  } catch (error) {
    console.error('Error getting workspace conversation:', error);
    throw error;
  }
}
