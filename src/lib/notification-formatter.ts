import type { NotificationType } from '@prisma/client';

export function formatNotificationMessage(
  type: NotificationType,
  userName: string,
  documentTitle?: string,
  meetingTitle?: string,
  invitedEmail?: string
): string {
  switch (type) {
    case 'WORKSPACE_UPDATE':
      return `${userName} updated the workspace profile`;

    case 'MEMBER_CREATE':
      return `${userName} has joined the workspace. Welcome aboard!`;
    case 'MEMBER_UPDATE':
      return `${userName} role was updated in the workspace`;
    case 'MEMBER_DELETE':
      return `${userName} removed a member from the workspace`;
    case 'MEMBER_LEAVE':
      return `${userName} left the workspace`;

    case 'INVITATION_CREATE':
      return `${userName} invited ${
        invitedEmail || 'someone'
      } to join this workspace`;
    case 'INVITATION_REVOKE':
      return `The invitation sent to ${
        invitedEmail || 'someone'
      } has been revoked by ${userName}`;

    case 'DOCUMENT_CREATE':
      return `${userName} created${
        documentTitle ? ` document "${documentTitle}"` : ' a new document'
      }`;
    case 'DOCUMENT_UPDATE':
      return `${userName} updated${
        documentTitle ? ` document "${documentTitle}"` : ' a document'
      }`;
    case 'DOCUMENT_DELETE':
      return `${userName} deleted${
        documentTitle ? ` document "${documentTitle}"` : ' a document'
      }`;
    case 'DOCUMENT_CONTENT_UPDATE':
      return `${userName} edited content in${
        documentTitle ? ` document "${documentTitle}"` : ' a document'
      }`;

    case 'MEETING_CREATE':
      return `${userName} scheduled${
        meetingTitle ? ` a new meeting: "${meetingTitle}"` : ' a new meeting'
      }`;
    case 'MEETING_UPDATE':
      return `${userName} updated${
        meetingTitle ? ` meeting: "${meetingTitle}"` : ' a meeting'
      }`;
    case 'MEETING_DELETE':
      return `${userName} canceled${
        meetingTitle ? ` meeting: "${meetingTitle}"` : ' a meeting'
      }`;

    default:
      return `${userName} performed an action in the workspace`;
  }
}
