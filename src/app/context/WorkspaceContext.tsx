'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import axios from 'axios';
import type { UserWorkspace } from '@/types/types';

interface WorkspaceContextType {
  workspaces: UserWorkspace[];
  loading: boolean;
  error: string | null;
  refetchWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined
);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/workspace');

      if (response.data.status === 'success') {
        setWorkspaces(response.data.data.workspaces);
      } else {
        setError(response.data.message || 'Failed to fetch workspaces');
      }
    } catch (err) {
      console.error('Error fetching workspaces:', err);
      setError('An error occurred while fetching workspaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const refetchWorkspaces = async () => {
    await fetchWorkspaces();
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        loading,
        error,
        refetchWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
