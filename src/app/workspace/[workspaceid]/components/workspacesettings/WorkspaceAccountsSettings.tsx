'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import InviteForm from './InviteForm';
import { useWorkspaceSettings } from './WorkspaceSettingsProvider';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePusherChannel } from '@/hooks/use-pusher-channel';
import type { WorkspaceInvitation, WorkspaceMember } from '@/types/types';
import { usePusherChannelContext } from '../PusherChannelProvider';

export function WorkspaceAccountsSettings() {
  const {
    workspaceInfo,
    isSuperAdmin,
    isAdmin,
    currentUser,
    initialMembers,
    initialInvitations,
  } = useWorkspaceSettings();
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>(
    'members'
  );
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchedMembers, setFetchedMembers] =
    useState<WorkspaceMember[]>(initialMembers);
  const [fetchedInvitations, setFetchedInvitations] =
    useState<WorkspaceInvitation[]>(initialInvitations);

  const router = useRouter();

  // Subscribe to workspace-specific channel
  const { channel: workspaceChannel } = usePusherChannelContext();

  // Simple derived state - no need for useMemo
  const isInviteFormVisible = activeTab === 'invitations' && showInviteForm;

  // Simple derived state - no need for useMemo
  const superAdmins = fetchedMembers.filter((m) => m.role === 'SUPER_ADMIN');

  // Simple derived state - no need for useMemo
  const itemsPerPage = activeTab === 'members' ? 4 : 2;

  // Simple calculations - no need for useMemo
  const members = fetchedMembers.map((member) => ({
    email: member.user.email,
    date: new Date(member.joinedAt).toLocaleDateString(),
    role: member.role,
    userId: member.user.id,
    name: member.user.name,
    image: member.user.image,
  }));

  const invitations = fetchedInvitations.map((invitation) => ({
    email: invitation.email,
    date: new Date(invitation.invitedAt).toLocaleDateString(),
    role: invitation.role,
    id: invitation.id,
    invitedBy: invitation.invitedBy?.name || '',
  }));

  const totalPages = Math.ceil(
    (activeTab === 'members' ? members.length : invitations.length) /
      itemsPerPage
  );

  const paginatedData = (activeTab === 'members' ? members : invitations).slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Set up Pusher event listeners
  useEffect(() => {
    if (!workspaceChannel) return;

    // Listen for member updates
    const handleMemberAdded = (member: WorkspaceMember) => {
      setFetchedMembers((prev) => [...prev, member]);
    };

    const handleMemberRemoved = (userId: string) => {
      setFetchedMembers((prev) =>
        prev.filter((member) => member.user.id !== userId)
      );
    };

    const handleMemberLeaved = (userId: string) => {
      setFetchedMembers((prev) =>
        prev.filter((member) => member.user.id !== userId)
      );

      if (userId === currentUser.id) {
        router.push('/dashboard');
      }
    };

    const handleMemberUpdated = (updatedMember: WorkspaceMember) => {
      setFetchedMembers((prev) =>
        prev.map((member) =>
          member.user.id === updatedMember.user.id ? updatedMember : member
        )
      );
    };

    // Listen for invitation updates
    const handleInvitationAdded = (invitation: WorkspaceInvitation) => {
      setFetchedInvitations((prev) => [...prev, invitation]);
    };

    const handleInvitationRemoved = (invitationId: string) => {
      setFetchedInvitations((prev) =>
        prev.filter((invitation) => invitation.id !== invitationId)
      );
    };

    // Subscribe to events
    workspaceChannel.bind('member-added', handleMemberAdded);
    workspaceChannel.bind('member-removed', handleMemberRemoved);
    workspaceChannel.bind('member-leaved', handleMemberLeaved);
    workspaceChannel.bind('member-updated', handleMemberUpdated);
    workspaceChannel.bind('invitation-added', handleInvitationAdded);
    workspaceChannel.bind('invitation-removed', handleInvitationRemoved);

    // Cleanup
    return () => {
      workspaceChannel.unbind('member-added', handleMemberAdded);
      workspaceChannel.unbind('member-removed', handleMemberRemoved);
      workspaceChannel.unbind('member-leaved', handleMemberLeaved);
      workspaceChannel.unbind('member-updated', handleMemberUpdated);
      workspaceChannel.unbind('invitation-added', handleInvitationAdded);
      workspaceChannel.unbind('invitation-removed', handleInvitationRemoved);
    };
  }, [workspaceChannel]);

  useEffect(() => {
    if (activeTab === 'members') {
      setShowInviteForm(false);
    }
  }, [activeTab]);

  // Using useCallback for functions passed to child components or event handlers
  const canChangeRole = useCallback(
    (item: any) => {
      return !(
        activeTab === 'invitations' ||
        (!isSuperAdmin && !isAdmin) ||
        (isAdmin && item.role === 'SUPER_ADMIN') ||
        item.email === currentUser.email ||
        (isAdmin && item.role === 'ADMIN')
      );
    },
    [activeTab, isSuperAdmin, isAdmin, currentUser.email]
  );

  const handleRemoveMember = useCallback(
    async (userId: string, role: string) => {
      if (!workspaceInfo) return;

      const isTargetSuperAdmin = role === 'SUPER_ADMIN';
      const isTargetAdmin = role === 'ADMIN';
      const currentSuperAdmins = fetchedMembers.filter(
        (member) => member.role === 'SUPER_ADMIN'
      );

      if (isAdmin && (isTargetSuperAdmin || isTargetAdmin)) {
        toast.error('Admin can only remove Members.');
        return;
      }

      if (
        isSuperAdmin &&
        isTargetSuperAdmin &&
        currentSuperAdmins.length === 1 &&
        currentUser.id === userId
      ) {
        toast.error('You cannot remove yourself if there is only one Owner.');
        return;
      }

      try {
        await axios.delete(
          `/api/workspace/${workspaceInfo.id}/member/${userId}`
        );
        // toast.success('User removed successfully.');
        // No need to manually refresh since Pusher will handle it
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to remove user.');
      }
    },
    [workspaceInfo, isAdmin, isSuperAdmin, fetchedMembers, currentUser.id]
  );

  const handleLeave = useCallback(async () => {
    if (!workspaceInfo) return;

    try {
      if (superAdmins.length === 1 && isSuperAdmin) {
        toast.error(
          'You are the last Owner. Please assign a new Owner before leaving.'
        );
        return;
      }

      setIsSubmitting(true);

      await axios.delete(`/api/workspace/${workspaceInfo.id}/leave`);

      toast.success('You have left the workspace');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to leave workspace');
    } finally {
      setIsSubmitting(false);
    }
  }, [workspaceInfo, superAdmins.length, isSuperAdmin, router]);

  const handleRevokeInvitation = useCallback(
    async (invitationId: string) => {
      if (!workspaceInfo) return;

      try {
        await axios.delete(
          `/api/workspace/${workspaceInfo.id}/invitation/${invitationId}`
        );
        toast.success('Invitation revoked successfully.');
        // No need to manually refresh since Pusher will handle it
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || 'Failed to revoke invitation.'
        );
      }
    },
    [workspaceInfo]
  );

  const handleRoleChange = useCallback(
    async (userId: string, newRole: string) => {
      if (!workspaceInfo) return;

      try {
        await axios.put(`/api/workspace/${workspaceInfo.id}/member/${userId}`, {
          userId,
          newRole,
        });
        // toast.success('User role updated successfully');
        // No need to manually refresh since Pusher will handle it
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to update role');
      }
    },
    [workspaceInfo]
  );

  const handleTabChange = useCallback((tab: 'members' | 'invitations') => {
    setActiveTab(tab);
    setCurrentPage(1);
  }, []);

  const handleInviteClick = useCallback(() => {
    if (activeTab === 'members') {
      setActiveTab('invitations');
      setShowInviteForm(true);
    } else {
      setShowInviteForm(true);
    }
    setCurrentPage(1);
  }, [activeTab]);

  const handleInviteSubmit = useCallback((values: any) => {
    console.log('Invitation sent:', values);
    setShowInviteForm(false);
    // No need to manually refresh since Pusher will handle it
  }, []);

  const handleInviteCancel = useCallback(() => {
    setShowInviteForm(false);
  }, []);

  return (
    <>
      <div className="border-b">
        <div className="flex h-10 items-center justify-start gap-4">
          <button
            className={`relative h-full px-4 text-sm font-medium ${
              activeTab === 'members'
                ? 'text-primary before:absolute before:bottom-0 before:left-0 before:right-0 before:h-0.5 before:bg-primary'
                : 'text-muted-foreground'
            }`}
            onClick={() => handleTabChange('members')}
          >
            Members{' '}
            <Badge
              variant={'outline'}
              className={`ml-2 justify-center rounded-lg px-2 text-xs `}
              style={{ width: '32px' }}
            >
              {members.length}
            </Badge>
          </button>
          <button
            className={`relative h-full px-4 text-sm font-medium ${
              activeTab === 'invitations'
                ? 'text-primary before:absolute before:bottom-0 before:left-0 before:right-0 before:h-0.5 before:bg-primary'
                : 'text-muted-foreground'
            }`}
            onClick={() => handleTabChange('invitations')}
          >
            Invitations{' '}
            <Badge
              variant={'outline'}
              className={`ml-2 justify-center rounded-lg px-2 text-xs `}
              style={{ width: '32px' }}
            >
              {invitations.length}
            </Badge>
          </button>
        </div>
      </div>

      <div className="flex justify-end items-center mt-4">
        <Button
          onClick={handleInviteClick}
          disabled={!isSuperAdmin && !isAdmin}
        >
          Invite
        </Button>
      </div>

      {isInviteFormVisible && (
        <div className="mb-4 mt-2">
          <div className="rounded-lg border p-4">
            <h3 className="text-base font-medium mb-4">Invite new members</h3>
            <InviteForm
              workspaceId={workspaceInfo.id}
              isSuperAdmin={isSuperAdmin}
              isAdmin={isAdmin}
              onSubmit={handleInviteSubmit}
              onCancel={handleInviteCancel}
            />
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="rounded-lg border">
          <div className="p-4">
            <div className="grid grid-cols-[1fr_120px_120px_40px] gap-4 text-sm text-muted-foreground pb-2">
              <div>User</div>
              <div>{activeTab === 'members' ? 'Joined' : 'Invited'}</div>
              <div>Role</div>
              <div />
            </div>
            {paginatedData.map((item) => (
              <div
                key={
                  activeTab === 'members'
                    ? (item as any).userId
                    : (item as any).id
                }
                className="grid grid-cols-[1fr_120px_120px_40px] gap-4 items-center py-3 border-t"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    {activeTab === 'members' ? (
                      <AvatarImage
                        src={(item as any).image || ''}
                        alt={(item as any).name || ''}
                      />
                    ) : null}
                    <AvatarFallback>
                      {activeTab === 'members'
                        ? (
                            (item as any).name?.charAt(0) ||
                            item.email.charAt(0)
                          ).toUpperCase()
                        : item.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium truncate max-w-[180px]">
                      {activeTab === 'members'
                        ? (item as any).name
                        : item.email.split('@')[0]}
                    </div>
                    <div className="text-sm text-muted-foreground truncate max-w-[180px]">
                      {item.email}
                    </div>
                  </div>
                </div>
                <div className="text-sm">{item.date}</div>
                <div>
                  <Select
                    value={item.role}
                    onValueChange={(newRole) =>
                      handleRoleChange((item as any).userId, newRole)
                    }
                    disabled={!canChangeRole(item)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPER_ADMIN" disabled={isAdmin}>
                        Owner
                      </SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(isSuperAdmin || isAdmin) && (
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-red-50 cursor-pointer"
                          onClick={() => {
                            if (activeTab === 'invitations') {
                              handleRevokeInvitation((item as any).id);
                            } else if (activeTab === 'members') {
                              if (item.email === currentUser.email) {
                                handleLeave();
                              } else {
                                handleRemoveMember(
                                  (item as any).userId,
                                  item.role
                                );
                              }
                            }
                          }}
                        >
                          {activeTab === 'members'
                            ? item.email === currentUser.email
                              ? 'Leave workspace'
                              : 'Remove member'
                            : 'Revoke invitation'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
