'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import type { UserWorkspace } from '@/types/types';

interface UseUserWorkspaceReturn {
  workspaces: UserWorkspace[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useUserWorkspace = (): UseUserWorkspaceReturn => {
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

  const refetch = async () => {
    await fetchWorkspaces();
  };

  return { workspaces, loading, error, refetch };
};
