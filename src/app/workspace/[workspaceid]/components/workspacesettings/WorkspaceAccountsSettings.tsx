'use client';

import { useState, useEffect } from 'react';
import { MoreHorizontal, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

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
import { WorkspaceInvitation, WorkspaceMember } from '@/types/types';

export function WorkspaceAccountsSettings() {
  const { workspaceInfo, isSuperAdmin, isAdmin, currentUser } =
    useWorkspaceSettings();
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>(
    'members'
  );
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchedMembers, setFetchedMembers] = useState<WorkspaceMember[]>([]);
  const [fetchedInvitations, setFetchedInvitations] = useState<
    WorkspaceInvitation[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const isInviteFormVisible = activeTab === 'invitations' && showInviteForm;

  useEffect(() => {
    if (activeTab === 'members') {
      setShowInviteForm(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!workspaceInfo?.id) return;

      setIsLoading(true);
      try {
        const response = await axios.get(
          `/api/workspace/${workspaceInfo.id}/member`
        );
        if (response.data.status === 'success') {
          setFetchedMembers(response.data.data.members);
        }
      } catch (error: any) {
        console.error('Failed to fetch members:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch members');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchInvitations = async () => {
      if (!workspaceInfo?.id) return;

      setIsLoading(true);
      try {
        const response = await axios.get(
          `/api/workspace/${workspaceInfo.id}/invitation`
        );
        if (response.data.status === 'success') {
          setFetchedInvitations(response.data.data.invitations);
        }
      } catch (error: any) {
        console.error('Failed to fetch invitations:', error);
        toast.error(
          error.response?.data?.message || 'Failed to fetch invitations'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
    fetchInvitations();
  }, [workspaceInfo?.id]);

  const members =
    fetchedMembers.map((member) => ({
      email: member.user.email,
      date: new Date(member.joinedAt).toLocaleDateString(),
      role: member.role,
      userId: member.user.id,
      name: member.user.name,
      image: member.user.image,
    })) || [];

  const invitations =
    fetchedInvitations.map((invitation) => ({
      email: invitation.email,
      date: new Date(invitation.invitedAt).toLocaleDateString(),
      role: invitation.role,
      id: invitation.id,
      invitedBy: invitation.invitedBy?.name || '',
    })) || [];

  const itemsPerPage = activeTab === 'members' ? 4 : 2;
  const totalPages = Math.ceil(
    (activeTab === 'members' ? members.length : invitations.length) /
      itemsPerPage
  );

  const paginatedData = (activeTab === 'members' ? members : invitations).slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await axios.put(`/api/workspace/${workspaceInfo.id}/member/${userId}`, {
        userId,
        newRole,
      });
      toast.success('User role updated successfully');

      // Refresh the members list
      const response = await axios.get(
        `/api/workspace/${workspaceInfo.id}/member`
      );
      if (response.data.status === 'success') {
        setFetchedMembers(response.data.data.members);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string, role: string) => {
    if (!workspaceInfo) return;

    const isTargetSuperAdmin = role === 'SUPER_ADMIN';
    const isTargetAdmin = role === 'ADMIN';

    const superAdmins = fetchedMembers.filter(
      (member) => member.role === 'SUPER_ADMIN'
    );

    if (isAdmin && (isTargetSuperAdmin || isTargetAdmin)) {
      toast.error('Admin can only remove Members.');
      return;
    }

    if (
      isSuperAdmin &&
      isTargetSuperAdmin &&
      superAdmins.length === 1 &&
      currentUser.id === userId
    ) {
      toast.error('You cannot remove yourself if there is only one Owner.');
      return;
    }

    try {
      await axios.delete(`/api/workspace/${workspaceInfo.id}/member/${userId}`);
      toast.success('User removed successfully.');

      // Refresh the members list
      const response = await axios.get(
        `/api/workspace/${workspaceInfo.id}/member`
      );
      if (response.data.status === 'success') {
        setFetchedMembers(response.data.data.members);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove user.');
    }
  };

  async function handleLeave() {
    try {
      if (
        fetchedMembers.filter((m) => m.role === 'SUPER_ADMIN').length === 1 &&
        isSuperAdmin
      ) {
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
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!workspaceInfo) return;

    try {
      await axios.delete(
        `/api/workspace/${workspaceInfo.id}/invitation/${invitationId}`
      );
      toast.success('Invitation revoked successfully.');

      // Refresh the invitations list
      const response = await axios.get(
        `/api/workspace/${workspaceInfo.id}/invitation`
      );
      if (response.data.status === 'success') {
        setFetchedInvitations(response.data.data.invitations);
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Failed to revoke invitation.'
      );
    }
  };

  if (isLoading && members.length === 0) {
    return (
      <div className="flex justify-center items-center ml-60 absolute inset-0">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
      </div>
    );
  }

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
            onClick={() => {
              setActiveTab('members');
              setCurrentPage(1);
            }}
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
            onClick={() => {
              setActiveTab('invitations');
              setCurrentPage(1);
            }}
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
          onClick={() => {
            if (activeTab === 'members') {
              setActiveTab('invitations');
              setShowInviteForm(true);
            } else {
              setShowInviteForm(true);
            }
            setCurrentPage(1);
          }}
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
              onSubmit={(values) => {
                console.log('Invitation sent:', values);

                // Refresh the invitations list
                const refreshInvitations = async () => {
                  try {
                    const response = await axios.get(
                      `/api/workspace/${workspaceInfo.id}/invitation`
                    );
                    if (response.data.status === 'success') {
                      setFetchedInvitations(response.data.data.invitations);
                    }
                  } catch (error: any) {
                    console.error('Failed to refresh invitations:', error);
                  }
                };

                refreshInvitations();
                setShowInviteForm(false);
              }}
              onCancel={() => setShowInviteForm(false)}
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
                    defaultValue={item.role}
                    onValueChange={(newRole) =>
                      handleRoleChange((item as any).userId, newRole)
                    }
                    disabled={
                      activeTab === 'invitations' ||
                      (!isSuperAdmin && !isAdmin) ||
                      (isAdmin && item.role === 'SUPER_ADMIN') ||
                      item.email === currentUser.email ||
                      (isAdmin && item.role === 'ADMIN')
                    }
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
