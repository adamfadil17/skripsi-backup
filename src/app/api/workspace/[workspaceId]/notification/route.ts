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
  read: boolean;
  userId: string | null;
  documentId: string | null;
  userName?: string;
  userAvatar?: string;
  documentName?: string;
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

        return {
          ...notification,
          userName,
          userAvatar,
          documentName,
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

// Helper function to validate NotificationType
function isValidNotificationType(type: string): boolean {
  const validTypes = [
    'WORKSPACE_UPDATE',
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
