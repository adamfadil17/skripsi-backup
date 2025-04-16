'use client';

import { useState, useEffect } from 'react';

import type { Notification as UINotification } from '@/lib/notification';
import type { NotificationType } from '@prisma/client';
import { usePusherChannelContext } from '@/app/workspace/[workspaceid]/components/PusherChannelProvider';
import { formatNotificationMessage } from '@/lib/notification-formatter';
import axios from 'axios';

export function useNotifications(
  workspaceId: string,
  initialNotifications: UINotification[] = []
) {
  const [notifications, setNotifications] =
    useState<UINotification[]>(initialNotifications);
  const { channel: workspaceChannel } = usePusherChannelContext();

  // Function to add a new notification
  const addNotification = (notification: UINotification) => {
    setNotifications((prev) => [notification, ...prev]);
  };

  // Function to mark a notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      // Call API to mark the notification as read
      await axios.patch(`/api/workspace/${workspaceId}/notification`, {
        notificationId,
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Function to mark all notifications as read
  const markAllAsRead = async () => {
    try {
      // Call API to mark all notifications as read
      await axios.patch(`/api/workspace/${workspaceId}/notification`, {
        markAllAsRead: true,
      });

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Load initial notifications from the server
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get(
          `/api/workspace/${workspaceId}/notification`
        );
        // const data = await response.json();
        if (
          response.data.status === 'success' &&
          response.data.data?.notifications
        ) {
          // Convert API notifications to our UI notification format
          const formattedNotifications = response.data.data.notifications.map(
            (n: any) => ({
              id: n.id,
              type: mapDbTypeToUiType(n.type),
              activityType: mapDbTypeToActivityType(n.type),
              message:
                n.message ||
                formatNotificationMessage(
                  n.type,
                  n.userName || 'A user',
                  n.documentName,
                  n.meetingTitle,
                  n.invitedEmail
                ),
              user: {
                name: n.userName || 'A user',
                avatar:
                  n.userAvatar || '/images/placeholder.svg?height=32&width=32',
              },
              ...(n.documentName && { documentName: n.documentName }),
              ...(n.meetingTitle && { meetingTitle: n.meetingTitle }),
              ...(n.invitedEmail && { invitedEmail: n.invitedEmail }),
              timestamp: formatTimestamp(n.createdAt),
              read: n.read || false,
            })
          );
          setNotifications(formattedNotifications);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    if (workspaceId) {
      fetchNotifications();
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceChannel) return;

    // Workspace notifications
    const handleWorkspaceUpdate = (data: any) => {
      const notification: UINotification = {
        id: `workspace-update-${Date.now()}`,
        type: 'workspace',
        activityType: 'workspace_update',
        message: formatNotificationMessage(
          'WORKSPACE_UPDATE',
          data.updatedBy?.name || 'A user'
        ),
        user: {
          name: data.updatedBy?.name || 'A user',
          avatar:
            data.updatedBy?.image ||
            '/images/placeholder.svg?height=32&width=32',
        },
        timestamp: 'Just now',
        read: false,
      };
      addNotification(notification);
    };

    // Member notifications
    const handleMemberAdded = (data: any) => {
      const notification: UINotification = {
        id: `member-added-${Date.now()}`,
        type: 'member',
        activityType: 'member_create',
        message: formatNotificationMessage(
          'MEMBER_CREATE',
          data.member?.name || 'A user'
        ),
        user: {
          name: data.member?.name || 'A user',
          avatar:
            data.member?.image || '/images/placeholder.svg?height=32&width=32',
        },
        timestamp: 'Just now',
        read: false,
      };
      addNotification(notification);
    };

    const handleMemberUpdated = (data: any) => {
      const notification: UINotification = {
        id: `member-updated-${Date.now()}`,
        type: 'member',
        activityType: 'member_update',
        message: formatNotificationMessage(
          'MEMBER_UPDATE',
          data.member?.name || 'A user'
        ),
        user: {
          name: data.member?.name || 'A user',
          avatar:
            data.member?.image || '/images/placeholder.svg?height=32&width=32',
        },
        timestamp: 'Just now',
        read: false,
      };
      addNotification(notification);
    };

    const handleMemberRemoved = (data: any) => {
      const notification: UINotification = {
        id: `member-removed-${Date.now()}`,
        type: 'member',
        activityType: 'member_delete',
        message: formatNotificationMessage(
          'MEMBER_DELETE',
          data.member?.name || 'A user'
        ),
        user: {
          name: data.member?.name || 'A user',
          avatar:
            data.member?.image || '/images/placeholder.svg?height=32&width=32',
        },
        timestamp: 'Just now',
        read: false,
      };
      addNotification(notification);
    };

    // Invitation notifications
    const handleInvitationCreated = (data: any) => {
      const notification: UINotification = {
        id: `invitation-created-${Date.now()}`,
        type: 'invitation',
        activityType: 'invitation_create',
        message: formatNotificationMessage(
          'INVITATION_CREATE',
          data.invitedBy?.name || 'A user',
          undefined,
          undefined,
          data.email
        ),
        user: {
          name: data.invitedBy?.name || 'A user',
          avatar:
            data.invitedBy?.image ||
            '/images/placeholder.svg?height=32&width=32',
        },
        invitedEmail: data.email,
        timestamp: 'Just now',
        read: false,
      };
      addNotification(notification);
    };

    const handleInvitationRevoked = (data: any) => {
      const notification: UINotification = {
        id: `invitation-revoked-${Date.now()}`,
        type: 'invitation',
        activityType: 'invitation_delete',
        message: formatNotificationMessage(
          'INVITATION_REVOKE',
          data.revokedBy?.name || 'A user',
          undefined,
          undefined,
          data.email
        ),
        user: {
          name: data.revokedBy?.name || 'A user',
          avatar:
            data.revokedBy?.image ||
            '/images/placeholder.svg?height=32&width=32',
        },
        invitedEmail: data.email,
        timestamp: 'Just now',
        read: false,
      };
      addNotification(notification);
    };

    const handleDocumentAdded = (data: any) => {
      const notification: UINotification = {
        id: `document-added-${Date.now()}`,
        type: 'document',
        activityType: 'document_create',
        message: formatNotificationMessage(
          'DOCUMENT_CREATE',
          data.createdBy?.name || 'A user',
          data.title
        ),
        user: {
          name: data.createdBy?.name || 'A user',
          avatar:
            data.createdBy?.image ||
            '/images/placeholder.svg?height=32&width=32',
        },
        ...(data.title && { documentName: data.title }),
        timestamp: 'Just now',
        read: false,
      };
      addNotification(notification);
    };

    const handleDocumentUpdated = (data: any) => {
      const notification: UINotification = {
        id: `document-updated-${Date.now()}`,
        type: 'document',
        activityType: 'document_update',
        message: formatNotificationMessage(
          'DOCUMENT_UPDATE',
          data.updatedBy?.name || 'A user',
          data.title
        ),
        user: {
          name: data.updatedBy?.name || 'A user',
          avatar:
            data.updatedBy?.image ||
            '/images/placeholder.svg?height=32&width=32',
        },
        ...(data.title && { documentName: data.title }),
        timestamp: 'Just now',
        read: false,
      };
      addNotification(notification);
    };

    const handleDocumentRemoved = (data: any) => {
      const notification: UINotification = {
        id: `document-removed-${Date.now()}`,
        type: 'document',
        activityType: 'document_delete',
        message: formatNotificationMessage(
          'DOCUMENT_DELETE',
          data.deletedBy?.name || 'A user',
          data.title
        ),
        user: {
          name: data.deletedBy?.name || 'A user',
          avatar:
            data.deletedBy?.image ||
            '/images/placeholder.svg?height=32&width=32',
        },
        ...(data.title && { documentName: data.title }),
        timestamp: 'Just now',
        read: false,
      };
      addNotification(notification);
    };

    // Document content notifications
    const handleDocumentContentUpdated = (data: any) => {
      const notification: UINotification = {
        id: `document-content-${Date.now()}`,
        type: 'document',
        activityType: 'content_update',
        message: formatNotificationMessage(
          'DOCUMENT_CONTENT_UPDATE',
          data.editorName || 'A user',
          data.documentName
        ),
        user: {
          name: data.editorName || 'A user',
          avatar:
            data.editorAvatar || '/images/placeholder.svg?height=32&width=32',
        },
        documentName: data.documentName || 'Document',
        timestamp: 'Just now',
        read: false,
      };
      addNotification(notification);
    };

    // Meeting notifications
    const handleMeetingCreated = (data: any) => {
      const notification: UINotification = {
        id: `meeting-created-${Date.now()}`,
        type: 'meeting',
        activityType: 'meeting_create',
        message: formatNotificationMessage(
          'MEETING_CREATE',
          data.createdBy?.name || 'A user',
          undefined,
          data.title
        ),
        user: {
          name: data.createdBy?.name || 'A user',
          avatar:
            data.createdBy?.image ||
            '/images/placeholder.svg?height=32&width=32',
        },
        meetingTitle: data.title,
        timestamp: 'Just now',
        read: false,
      };
      addNotification(notification);
    };

    const handleMeetingUpdated = (data: any) => {
      const notification: UINotification = {
        id: `meeting-updated-${Date.now()}`,
        type: 'meeting',
        activityType: 'meeting_update',
        message: formatNotificationMessage(
          'MEETING_UPDATE',
          data.updatedBy?.name || 'A user',
          undefined,
          data.title
        ),
        user: {
          name: data.updatedBy?.name || 'A user',
          avatar:
            data.updatedBy?.image ||
            '/images/placeholder.svg?height=32&width=32',
        },
        meetingTitle: data.title,
        timestamp: 'Just now',
        read: false,
      };
      addNotification(notification);
    };

    const handleMeetingRemoved = (data: any) => {
      const notification: UINotification = {
        id: `meeting-removed-${Date.now()}`,
        type: 'meeting',
        activityType: 'meeting_delete',
        message: formatNotificationMessage(
          'MEETING_DELETE',
          data.deletedBy?.name || 'A user',
          undefined,
          data.title
        ),
        user: {
          name: data.deletedBy?.name || 'A user',
          avatar:
            data.deletedBy?.image ||
            '/images/placeholder.svg?height=32&width=32',
        },
        meetingTitle: data.title,
        timestamp: 'Just now',
        read: false,
      };
      addNotification(notification);
    };

    // New notification created
    const handleNotificationCreated = (data: any) => {
      const notification: UINotification = {
        id: data.id,
        type: mapDbTypeToUiType(data.type),
        activityType: mapDbTypeToActivityType(data.type),
        message:
          data.message ||
          formatNotificationMessage(
            data.type,
            data.userName || 'A user',
            data.documentName,
            data.meetingTitle,
            data.invitedEmail
          ),
        user: {
          name: data.userName || 'A user',
          avatar:
            data.userAvatar || '/images/placeholder.svg?height=32&width=32',
        },
        ...(data.documentName && { documentName: data.documentName }),
        ...(data.meetingTitle && { meetingTitle: data.meetingTitle }),
        ...(data.invitedEmail && { invitedEmail: data.invitedEmail }),
        timestamp: 'Just now',
        read: false,
      };
      addNotification(notification);
    };

    // Subscribe to workspace events
    workspaceChannel.bind('workspace-updated', handleWorkspaceUpdate);
    workspaceChannel.bind('member-added', handleMemberAdded);
    workspaceChannel.bind('member-updated', handleMemberUpdated);
    workspaceChannel.bind('member-removed', handleMemberRemoved);
    workspaceChannel.bind('invitation-created', handleInvitationCreated);
    workspaceChannel.bind('invitation-revoked', handleInvitationRevoked);
    workspaceChannel.bind('document-added', handleDocumentAdded);
    workspaceChannel.bind('document-updated', handleDocumentUpdated);
    workspaceChannel.bind('document-removed', handleDocumentRemoved);
    workspaceChannel.bind(
      'document-content-updated',
      handleDocumentContentUpdated
    );
    workspaceChannel.bind('meeting-created', handleMeetingCreated);
    workspaceChannel.bind('meeting-updated', handleMeetingUpdated);
    workspaceChannel.bind('meeting-removed', handleMeetingRemoved);
    workspaceChannel.bind('notification-created', handleNotificationCreated);

    // Cleanup function
    return () => {
      workspaceChannel.unbind('workspace-updated', handleWorkspaceUpdate);
      workspaceChannel.unbind('member-added', handleMemberAdded);
      workspaceChannel.unbind('member-updated', handleMemberUpdated);
      workspaceChannel.unbind('member-removed', handleMemberRemoved);
      workspaceChannel.unbind('invitation-created', handleInvitationCreated);
      workspaceChannel.unbind('invitation-revoked', handleInvitationRevoked);
      workspaceChannel.unbind('document-added', handleDocumentAdded);
      workspaceChannel.unbind('document-updated', handleDocumentUpdated);
      workspaceChannel.unbind('document-removed', handleDocumentRemoved);
      workspaceChannel.unbind(
        'document-content-updated',
        handleDocumentContentUpdated
      );
      workspaceChannel.unbind('meeting-created', handleMeetingCreated);
      workspaceChannel.unbind('meeting-updated', handleMeetingUpdated);
      workspaceChannel.unbind('meeting-removed', handleMeetingRemoved);
      workspaceChannel.unbind(
        'notification-created',
        handleNotificationCreated
      );
    };
  }, [workspaceChannel]);

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
  };
}

// Helper function to map DB notification types to UI notification types
function mapDbTypeToUiType(
  type: NotificationType
): 'workspace' | 'document' | 'meeting' | 'invitation' | 'member' {
  switch (type) {
    case 'WORKSPACE_UPDATE':
      return 'workspace';
    case 'DOCUMENT_CREATE':
    case 'DOCUMENT_UPDATE':
    case 'DOCUMENT_DELETE':
    case 'DOCUMENT_CONTENT_UPDATE':
      return 'document';
    case 'MEETING_CREATE':
    case 'MEETING_UPDATE':
    case 'MEETING_DELETE':
      return 'meeting';
    case 'INVITATION_CREATE':
    case 'INVITATION_REVOKE':
      return 'invitation';
    case 'MEMBER_CREATE':
    case 'MEMBER_UPDATE':
    case 'MEMBER_DELETE':
    case 'MEMBER_LEAVE':
      return 'member';
    default:
      return 'workspace';
  }
}

// Helper function to map DB notification types to activity types
function mapDbTypeToActivityType(type: NotificationType): string {
  switch (type) {
    case 'WORKSPACE_UPDATE':
      return 'workspace_update';
    case 'DOCUMENT_CREATE':
      return 'document_create';
    case 'DOCUMENT_UPDATE':
      return 'document_update';
    case 'DOCUMENT_DELETE':
      return 'document_delete';
    case 'DOCUMENT_CONTENT_UPDATE':
      return 'content_update';
    case 'MEETING_CREATE':
      return 'meeting_create';
    case 'MEETING_UPDATE':
      return 'meeting_update';
    case 'MEETING_DELETE':
      return 'meeting_delete';
    case 'INVITATION_CREATE':
      return 'invitation_create';
    case 'INVITATION_REVOKE':
      return 'invitation_delete';
    case 'MEMBER_CREATE':
      return 'member_create';
    case 'MEMBER_UPDATE':
      return 'member_update';
    case 'MEMBER_DELETE':
      return 'member_delete';
    case 'MEMBER_LEAVE':
      return 'member_leave';
    default:
      return 'workspace_update';
  }
}

// Helper function to format timestamps
function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}
