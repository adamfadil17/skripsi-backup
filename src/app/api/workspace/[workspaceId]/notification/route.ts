import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import prisma from '@/lib/prismadb';
import { pusherServer } from '@/lib/pusher';
import type { NotificationType } from '@prisma/client';

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

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId: currentUser.id,
        workspaceId,
      },
      select: {
        joinedAt: true,
      },
    });

    if (!membership) {
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

    const userJoinedAt = membership.joinedAt;

    const notifications = await prisma.notification.findMany({
      where: {
        workspaceId,
        createdAt: {
          gte: userJoinedAt
        }
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
      take: 50,
    });

    const enhancedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        let userName = 'A user';
        let userAvatar = '/images/placeholder.svg?height=32&width=32';
        let documentName = null;
        const meetingTitle = null;

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

        if (notification.documentId) {
          const document = await prisma.document.findUnique({
            where: { id: notification.documentId },
            select: { title: true },
          });
          if (document) {
            documentName = document.title;
          }
        }

        const isRead = notification.readBy.length > 0;

        return {
          ...notification,
          userName,
          userAvatar,
          documentName,
          meetingTitle,
          read: isRead,
          readBy: undefined,
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

    const notification = await prisma.notification.create({
      data: {
        workspaceId,
        message,
        type: type as NotificationType,
        userId: currentUser.id,
        ...(documentId && { documentId }),
      },
    });

    const notificationData: EnhancedNotification = {
      ...notification,
      userName: currentUser.name,
      userAvatar: currentUser.image,
      read: false,
    };

    if (documentId) {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: { title: true },
      });
      if (document) {
        notificationData.documentName = document.title;
      }
    }

    await pusherServer.trigger(
      `notification-${workspaceId}`,
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

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId: currentUser.id,
        workspaceId,
      },
      select: {
        joinedAt: true,
      },
    });

    if (!membership) {
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

    const userJoinedAt = membership.joinedAt;
    const body = await req.json();

    if (body.notificationId) {
      const notification = await prisma.notification.findFirst({
        where: {
          id: body.notificationId,
          workspaceId,
          createdAt: {
            gte: userJoinedAt 
          }
        },
      });

      if (!notification) {
        return NextResponse.json(
          {
            status: 'error',
            code: 404,
            error_type: 'NotFound',
            message: 'Notification not found or you do not have permission to view it',
          },
          { status: 404 }
        );
      }

      await prisma.notificationRead.upsert({
        where: {
          notificationId_userId: {
            notificationId: body.notificationId,
            userId: currentUser.id,
          },
        },
        update: {},
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

    else if (body.markAllAsRead) {
      const unreadNotifications = await prisma.notification.findMany({
        where: {
          workspaceId,
          createdAt: {
            gte: userJoinedAt
          },
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
              update: {},
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
    'MESSAGE_RECEIVED',
  ];
  return validTypes.includes(type);
}