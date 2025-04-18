'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import SidebarNav from './SidebarNav';
import LoadingScreen from './LoadingScreen';
import type { User } from '@prisma/client';
import type {
  WorkspaceInfo,
  WorkspaceMember,
  WorkspaceDocument,
  WorkspaceInvitation,
} from '@/types/types';
import { notFound } from 'next/navigation';

interface WorkspaceSidebarProps {
  workspaceId: string;
  currentUser: User;
}

export default function WorkspaceSidebar({
  workspaceId,
  currentUser,
}: WorkspaceSidebarProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(
    null
  );
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  // Fetch members
  const fetchMembers = useCallback(async () => {
    if (!workspaceId) return;

    try {
      const response = await axios.get(`/api/workspace/${workspaceId}/member`);
      if (response.data.status === 'success') {
        setMembers(response.data.data.members);

        // Determine user role from members list
        const currentMember = response.data.data.members.find(
          (member: WorkspaceMember) => member.user.id === currentUser.id
        );

        if (currentMember) {
          setIsSuperAdmin(currentMember.role === 'SUPER_ADMIN');
          setIsAdmin(currentMember.role === 'ADMIN');
        }
      }
    } catch (error) {
      console.error('Failed to fetch workspace members:', error);
    }
  }, [workspaceId, currentUser.id]);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    if (!workspaceId) return;

    try {
      const response = await axios.get(
        `/api/workspace/${workspaceId}/document`
      );
      if (response.data.status === 'success') {
        setDocuments(response.data.data.documents);
      }
    } catch (error) {
      console.error('Failed to fetch workspace documents:', error);
    }
  }, [workspaceId]);

  const fetchInvitations = useCallback(async () => {
    if (!workspaceId) return;

    try {
      const response = await axios.get(
        `/api/workspace/${workspaceId}/invitation`
      );

      if (response.data.status === 'success') {
        setInvitations(response.data.data.invitations);
      }
    } catch (error) {
      console.error('Failed to fetch workspace invitations', error);
    }
  }, [workspaceId]);

  const fetchWorkspaceInfo = useCallback(async () => {
    try {
      const response = await axios.get(`/api/workspace/${workspaceId}`);
      if (response.data.status === 'success') {
        setWorkspaceInfo(response.data.data.workspace);
      } else {
        toast.error('Failed to load workspace');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to fetch workspace info:', error);
      toast.error('Failed to load workspace information');
      router.push('/dashboard');
    }
  }, [workspaceId, router]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsLoading(true);
        await fetchWorkspaceInfo();
        await fetchMembers();
        await fetchDocuments();
        await fetchInvitations();
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [fetchWorkspaceInfo, fetchMembers, fetchDocuments, fetchInvitations]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!workspaceInfo) {
    return notFound(); // This should not happen as we redirect on error, but just in case
  }

  return (
    <SidebarNav
      workspaceId={workspaceId}
      currentUser={currentUser}
      initialWorkspaceInfo={workspaceInfo}
      initialMembers={members}
      initialDocuments={documents}
      initialInvitations={invitations}
      isSuperAdmin={isSuperAdmin}
      isAdmin={isAdmin}
    />
  );
}
