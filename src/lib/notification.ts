export type NotificationType =
  | 'workspace'
  | 'invitation'
  | 'member'
  | 'document'
  | 'meeting';
export type WorkspaceActivityType = 'workspace_update';
export type DocumentActivityType =
  | 'document_create'
  | 'document_update'
  | 'document_delete'
  | 'content_update';
export type MeetingActivityType =
  | 'meeting_create'
  | 'meeting_update'
  | 'meeting_delete';
export type InvitationActivityType = 'invitation_create' | 'invitation_delete';
export type MemberActivityType =
  | 'member_create'
  | 'member_update'
  | 'member_delete'
  | 'member_leave';

interface BaseNotification {
  id: string;
  type: NotificationType;
  user: {
    name: string;
    avatar: string;
  };
  message: string;
  timestamp: string;
  read: boolean;
}

export interface WorkspaceNotification extends BaseNotification {
  type: 'workspace';
  activityType: WorkspaceActivityType;
}

export interface InvitationNotification extends BaseNotification {
  type: 'invitation';
  activityType: InvitationActivityType;
  invitedEmail?: string;
}

export interface MemberNotification extends BaseNotification {
  type: 'member';
  activityType: MemberActivityType;
}

export interface DocumentNotification extends BaseNotification {
  type: 'document';
  activityType: DocumentActivityType;
  documentName?: string;
}

export interface MeetingNotification extends BaseNotification {
  type: 'meeting';
  activityType: MeetingActivityType;
  meetingTitle?: string;
}

export type Notification =
  | WorkspaceNotification
  | InvitationNotification
  | MemberNotification
  | DocumentNotification
  | MeetingNotification;

export function isWorkspaceNotification(
  notification: Notification
): notification is WorkspaceNotification {
  return notification.type === 'workspace';
}

export function isInvitationNotification(
  notification: Notification
): notification is InvitationNotification {
  return notification.type === 'invitation';
}

export function isMemberNotification(
  notification: Notification
): notification is MemberNotification {
  return notification.type === 'member';
}

export function isDocumentNotification(
  notification: Notification
): notification is DocumentNotification {
  return notification.type === 'document';
}

export function isMeetingNotification(
  notification: Notification
): notification is MeetingNotification {
  return notification.type === 'meeting';
}

// Function to check if a notification should be shown in the workspace filter
export function isWorkspaceFilterNotification(
  notification: Notification
): boolean {
  return (
    notification.type === 'workspace' ||
    notification.type === 'invitation' ||
    notification.type === 'member' ||
    notification.type === 'meeting'
  );
}

// Function to check if a notification should be shown in the document filter
export function isDocumentFilterNotification(
  notification: Notification
): boolean {
  return notification.type === 'document';
}
