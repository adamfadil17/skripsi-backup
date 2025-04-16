import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import prisma from '@/lib/prismadb';
import { pusherServer } from '@/lib/pusher';
import type { NotificationType } from '@prisma/client';

// Add this interface for enhanced notification data
interface EnhancedNotification {
  id: string;
  workspaceId: string;
  message: string;
  type: NotificationType;
  createdAt: Date;
  read: boolean; // This is now computed based on NotificationRead
  userId: string | null;
  documentId: string | null;
  userName?: string;
  userAvatar?: string;
  documentName?: string;
  meetingTitle?: string;
}

export async function GET(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json(
        {
          status: 'error',
          code: 401,
          error_type: 'Unauthorized',
          message: 'Unauthorized access',
        },
        { status: 401 }
      );
    }

    const { workspaceId } = params;
    if (!workspaceId) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Workspace ID is required',
        },
        { status: 400 }
      );
    }

    // Check if user is a member of the workspace
    const isMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: currentUser.id,
        workspaceId,
      },
    });

    if (!isMember) {
      return NextResponse.json(
        {
          status: 'error',
          code: 403,
          error_type: 'Forbidden',
          message: 'You do not have access to this workspace',
        },
        { status: 403 }
      );
    }

    // Get notifications for this workspace
    const notifications = await prisma.notification.findMany({
      where: {
        workspaceId,
      },
      include: {
        readBy: {
          where: {
            userId: currentUser.id,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to 50 most recent notifications
    });

    // Get user information for each notification
    const enhancedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        let userName = 'A user';
        let userAvatar = '/images/placeholder.svg?height=32&width=32';
        let documentName = null;
        const meetingTitle = null;

        // If notification has userId, get user info
        if (notification.userId) {
          const user = await prisma.user.findUnique({
            where: { id: notification.userId },
            select: { name: true, image: true },
          });
          if (user) {
            userName = user.name;
            userAvatar = user.image || userAvatar;
          }
        }

        // If notification has documentId, get document title
        if (notification.documentId) {
          const document = await prisma.document.findUnique({
            where: { id: notification.documentId },
            select: { title: true },
          });
          if (document) {
            documentName = document.title;
          }
        }

        // Determine if notification is read by current user
        const isRead = notification.readBy.length > 0;

        return {
          ...notification,
          userName,
          userAvatar,
          documentName,
          meetingTitle,
          read: isRead, // Set read status based on NotificationRead
          readBy: undefined, // Remove readBy from response
        };
      })
    );

    return NextResponse.json(
      {
        status: 'success',
        code: 200,
        data: { notifications: enhancedNotifications },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      {
        status: 'error',
        code: 500,
        error_type: 'InternalServerError',
        message: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json(
        {
          status: 'error',
          code: 401,
          error_type: 'Unauthorized',
          message: 'Unauthorized access',
        },
        { status: 401 }
      );
    }

    const { workspaceId } = params;
    if (!workspaceId) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Workspace ID is required',
        },
        { status: 400 }
      );
    }

    // Check if user is a member of the workspace
    const isMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: currentUser.id,
        workspaceId,
      },
    });

    if (!isMember) {
      return NextResponse.json(
        {
          status: 'error',
          code: 403,
          error_type: 'Forbidden',
          message: 'You do not have access to this workspace',
        },
        { status: 403 }
      );
    }

    const { message, type, documentId } = await req.json();

    if (!message || !type) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Message and type are required',
        },
        { status: 400 }
      );
    }

    // Validate that type is a valid NotificationType
    if (!isValidNotificationType(type)) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Invalid notification type',
        },
        { status: 400 }
      );
    }

    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        workspaceId,
        message,
        type: type as NotificationType,
        userId: currentUser.id,
        ...(documentId && { documentId }),
      },
    });

    // Prepare notification data with user info for Pusher
    const notificationData: EnhancedNotification = {
      ...notification,
      userName: currentUser.name,
      userAvatar: currentUser.image,
      read: false, // New notifications are unread by default
    };

    // If notification is related to a document, add document name
    if (documentId) {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: { title: true },
      });
      if (document) {
        notificationData.documentName = document.title;
      }
    }

    // Trigger Pusher event on the workspace channel
    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      'notification-created',
      notificationData
    );

    return NextResponse.json(
      {
        status: 'success',
        code: 201,
        message: 'Notification created successfully',
        data: { notification },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      {
        status: 'error',
        code: 500,
        error_type: 'InternalServerError',
        message: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}

// New PATCH endpoint for marking notifications as read
export async function PATCH(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json(
        {
          status: 'error',
          code: 401,
          error_type: 'Unauthorized',
          message: 'Unauthorized access',
        },
        { status: 401 }
      );
    }

    const { workspaceId } = params;
    if (!workspaceId) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Workspace ID is required',
        },
        { status: 400 }
      );
    }

    // Check if user is a member of the workspace
    const isMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: currentUser.id,
        workspaceId,
      },
    });

    if (!isMember) {
      return NextResponse.json(
        {
          status: 'error',
          code: 403,
          error_type: 'Forbidden',
          message: 'You do not have access to this workspace',
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    // For marking a specific notification as read
    if (body.notificationId) {
      // Check if notification exists and belongs to the workspace
      const notification = await prisma.notification.findFirst({
        where: {
          id: body.notificationId,
          workspaceId,
        },
      });

      if (!notification) {
        return NextResponse.json(
          {
            status: 'error',
            code: 404,
            error_type: 'NotFound',
            message: 'Notification not found',
          },
          { status: 404 }
        );
      }

      // Create or update read status for this notification
      await prisma.notificationRead.upsert({
        where: {
          notificationId_userId: {
            notificationId: body.notificationId,
            userId: currentUser.id,
          },
        },
        update: {}, // Nothing to update
        create: {
          notificationId: body.notificationId,
          userId: currentUser.id,
        },
      });

      return NextResponse.json(
        {
          status: 'success',
          code: 200,
          message: 'Notification marked as read',
        },
        { status: 200 }
      );
    }

    // For marking all notifications as read
    else if (body.markAllAsRead) {
      // Get all unread notifications for this workspace
      const unreadNotifications = await prisma.notification.findMany({
        where: {
          workspaceId,
          readBy: {
            none: {
              userId: currentUser.id,
            },
          },
        },
        select: {
          id: true,
        },
      });

      // Mark all as read using transactions with individual upserts
      // This replaces the createMany with skipDuplicates which isn't supported in MongoDB
      if (unreadNotifications.length > 0) {
        await prisma.$transaction(
          unreadNotifications.map((notification) =>
            prisma.notificationRead.upsert({
              where: {
                notificationId_userId: {
                  notificationId: notification.id,
                  userId: currentUser.id,
                },
              },
              update: {}, // Nothing to update
              create: {
                notificationId: notification.id,
                userId: currentUser.id,
              },
            })
          )
        );
      }

      return NextResponse.json(
        {
          status: 'success',
          code: 200,
          message: 'All notifications marked as read',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        status: 'error',
        code: 400,
        error_type: 'BadRequest',
        message: 'Invalid request body',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      {
        status: 'error',
        code: 500,
        error_type: 'InternalServerError',
        message: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}

// Helper function to validate NotificationType
function isValidNotificationType(type: string): boolean {
  const validTypes = [
    'WORKSPACE_UPDATE',
    'MEMBER_CREATE',
    'MEMBER_UPDATE',
    'MEMBER_DELETE',
    'MEMBER_LEAVE',
    'INVITATION_CREATE',
    'INVITATION_REVOKE',
    'DOCUMENT_CREATE',
    'DOCUMENT_UPDATE',
    'DOCUMENT_DELETE',
    'DOCUMENT_CONTENT_UPDATE',
    'MEETING_CREATE',
    'MEETING_UPDATE',
    'MEETING_DELETE',
  ];
  return validTypes.includes(type);
}
