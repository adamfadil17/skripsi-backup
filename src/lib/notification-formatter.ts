import type { WorkspaceActivityType, DocumentActivityType } from "@/lib/notification"

export function formatWorkspaceActivity(type: WorkspaceActivityType, userName: string): string {
  switch (type) {
    case "workspace_update":
      return `${userName} updated the workspace settings`
    case "invitation":
      return `${userName} invited a new member to the workspace`
    case "role_change":
      return `${userName}'s role has been updated to Admin`
    case "meeting":
      return `${userName} modified the meeting schedule`
    case "document_update":
      return `${userName} made changes to a document`
    default:
      return `${userName} performed an action in the workspace`
  }
}

export function formatDocumentActivity(type: DocumentActivityType, userName: string): string {
  switch (type) {
    case "content_update":
      return `${userName} made changes to the document content`
    default:
      return `${userName} performed an action in the document`
  }
}

