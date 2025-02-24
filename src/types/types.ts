export interface Workspace {
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