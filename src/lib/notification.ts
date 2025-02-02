export type NotificationType = 'workspace' | 'document';

export type WorkspaceActivityType =
  | 'workspace_update'
  | 'invitation'
  | 'role_change'
  | 'meeting'
  | 'document_update';

export type DocumentActivityType = 'content_update';

interface BaseNotification {
  id: string;
  type: NotificationType;
  user: {
    name: string;
    avatar: string;
  };
  timestamp: string;
  read: boolean;
}

export interface WorkspaceNotification extends BaseNotification {
  type: 'workspace';
  activityType: WorkspaceActivityType;
}

export interface WorkspaceInvitationNotification extends WorkspaceNotification {
  activityType: 'invitation';
  invitedEmail: string;
}

export interface DocumentNotification extends BaseNotification {
  type: 'document';
  activityType: DocumentActivityType;
  documentName: string;
}

export type Notification =
  | WorkspaceNotification
  | WorkspaceInvitationNotification
  | DocumentNotification;

export function isWorkspaceNotification(
  notification: Notification
): notification is WorkspaceNotification {
  return notification.type === 'workspace';
}

export function isWorkspaceInvitationNotification(
  notification: Notification
): notification is WorkspaceInvitationNotification {
  return (
    isWorkspaceNotification(notification) &&
    notification.activityType === 'invitation'
  );
}

export function isDocumentNotification(
  notification: Notification
): notification is DocumentNotification {
  return notification.type === 'document';
}
