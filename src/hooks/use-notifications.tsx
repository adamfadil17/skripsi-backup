'use client';

import { useState, useEffect } from 'react';

import type { Notification as UINotification } from '@/lib/notification';
import type { NotificationType } from '@prisma/client';
import { usePusherChannelContext } from '@/app/workspace/[workspaceid]/components/PusherChannelProvider';

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
  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  // Function to mark all notifications as read
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Load initial notifications from the server
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch(
          `/api/workspace/${workspaceId}/notification`
        );
        const data = await response.json();
        if (data.status === 'success' && data.data?.notifications) {
          // Convert API notifications to our UI notification format
          const formattedNotifications = data.data.notifications.map(
            (n: any) => ({
              id: n.id,
              type: mapDbTypeToUiType(n.type),
              activityType: mapDbTypeToActivityType(n.type),
              user: {
                name: n.userName || 'A user',
                avatar: n.userAvatar || '/images/placeholder.svg?height=32&width=32',
              },
              ...(n.documentName && { documentName: n.documentName }),
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
        user: {
          name: data.updatedBy?.name || 'A user',
          avatar:
            data.updatedBy?.image || '/images/placeholder.svg?height=32&width=32',
        },
        timestamp: 'Just now',
        read: false,
      };
      addNotification(notification);
    };

    const handleDocumentAdded = (data: any) => {
      const notification: UINotification = {
        id: `document-added-${Date.now()}`,
        type: 'workspace',
        activityType: 'document_update',
        user: {
          name: data.createdBy?.name || 'A user',
          avatar:
            data.createdBy?.image || '/images/placeholder.svg?height=32&width=32',
        },
        timestamp: 'Just now',
        read: false,
      };
      addNotification(notification);
    };

    const handleDocumentUpdated = (data: any) => {
      const notification: UINotification = {
        id: `document-updated-${Date.now()}`,
        type: 'workspace',
        activityType: 'document_update',
        user: {
          name: data.updatedBy?.name || 'A user',
          avatar:
            data.updatedBy?.image || '/images/placeholder.svg?height=32&width=32',
        },
        timestamp: 'Just now',
        read: false,
      };
      addNotification(notification);
    };

    const handleDocumentRemoved = (documentId: string) => {
      const notification: UINotification = {
        id: `document-removed-${Date.now()}`,
        type: 'workspace',
        activityType: 'document_update',
        user: {
          name: 'A user',
          avatar: '/images/placeholder.svg?height=32&width=32',
        },
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
        user: {
          name: data.editorName || 'A user',
          avatar: '/images/placeholder.svg?height=32&width=32',
        },
        documentName: data.documentName || 'Document',
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
        user: {
          name: data.userName || 'A user',
          avatar: data.userAvatar || '/images/placeholder.svg?height=32&width=32',
        },
        ...(data.documentName && { documentName: data.documentName }),
        timestamp: 'Just now',
        read: false,
      };
      addNotification(notification);
    };

    // Subscribe to workspace events
    workspaceChannel.bind('workspace-updated', handleWorkspaceUpdate);
    workspaceChannel.bind('document-added', handleDocumentAdded);
    workspaceChannel.bind('document-updated', handleDocumentUpdated);
    workspaceChannel.bind('document-removed', handleDocumentRemoved);
    workspaceChannel.bind(
      'document-content-updated',
      handleDocumentContentUpdated
    );
    workspaceChannel.bind('notification-created', handleNotificationCreated);

    // Cleanup function
    return () => {
      workspaceChannel.unbind('workspace-updated', handleWorkspaceUpdate);
      workspaceChannel.unbind('document-added', handleDocumentAdded);
      workspaceChannel.unbind('document-updated', handleDocumentUpdated);
      workspaceChannel.unbind('document-removed', handleDocumentRemoved);
      workspaceChannel.unbind(
        'document-content-updated',
        handleDocumentContentUpdated
      );
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
function mapDbTypeToUiType(type: NotificationType): 'workspace' | 'document' {
  if (type === 'DOCUMENT_CONTENT_UPDATE') {
    return 'document';
  }
  return 'workspace';
}

// Helper function to map DB notification types to activity types
function mapDbTypeToActivityType(type: NotificationType): string {
  switch (type) {
    case 'WORKSPACE_UPDATE':
      return 'workspace_update';
    case 'DOCUMENT_CREATE':
    case 'DOCUMENT_UPDATE':
    case 'DOCUMENT_DELETE':
      return 'document_update';
    case 'DOCUMENT_CONTENT_UPDATE':
      return 'content_update';
    case 'MEETING_CREATE':
    case 'MEETING_UPDATE':
    case 'MEETING_DELETE':
      return 'meeting';
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
