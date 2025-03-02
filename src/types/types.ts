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
};

// Define the main type for workspace information
export type WorkspaceInfo = {
  id: string;
  name: string;
  emoji: string | null;
  coverImage: string | null;
  members: WorkspaceMember[];
  documents: WorkspaceDocument[];
};
