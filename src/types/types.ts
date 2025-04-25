export interface UserWorkspace {
  id: string;
  name: string;
  emoji?: string;
  coverImage?: string;
  documentCount: number;
  members: {
    userId: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
  }[];
}

export type WorkspaceMember = {
  id: string;
  role: string;
  userId: string;
  joinedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
};

export type WorkspaceDocument = {
  id: string;
  title: string;
  emoji: string | null;
  coverImage: string | null;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  updatedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

// Updated to ConversationMessage
export type ConversationMessage = {
  id: string;
  body: string | null;
  image: string | null;
  conversationId: string;
  senderId: string;
  createdAt: Date;
  seenIds: string[];
  seenBy: {
    id: string;
    name: string | null;
    email: string;
  }[];
  sender: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  isEdited?: boolean;
  editedAt?: Date | null;
  isDeleted?: boolean;
  deletedAt?: Date | null;
};

// Added WorkspaceConversation type
export type WorkspaceConversation = {
  id: string;
  workspaceId: string;
  lastMessageAt: Date;
  messages: ConversationMessage[];
};

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: Date;
  sender: {
    id: string;
    name: string | null;
    email: string;
  };
};

export type WorkspaceChat = {
  id: string;
  messages: ChatMessage[];
};

export type WorkspaceNotification = {
  id: string;
  message: string;
  type: string;
  createdAt: Date;
};

export type WorkspaceInvitation = {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
  invitedAt: Date;
  invitedBy: {
    id: string;
    name: string | null;
    email: string;
  };
};

// Define the main type for workspace information
export type WorkspaceInfo = {
  id: string;
  name: string;
  emoji: string | null;
  coverImage: string | null;
};
