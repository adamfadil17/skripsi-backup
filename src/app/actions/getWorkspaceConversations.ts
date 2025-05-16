// app/actions/getWorkspaceConversation.ts
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

    // Find or create conversation for the workspace
    let conversation = await prisma.conversation.findUnique({
      where: {
        workspaceId,
      },
      include: {
        messages: {
          where: {
            createdAt: { gte: userJoinDate }, // Only include messages after join date
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
              createdAt: { gte: userJoinDate }, // Only include messages after join date
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

    return workspaceConversation;
  } catch (error) {
    console.error('Error getting workspace conversation:', error);
    throw error;
  }
}
