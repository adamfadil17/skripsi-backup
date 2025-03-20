'use client';

import { useState, useEffect } from 'react';
import { MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

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

export function WorkspaceAccountsSettings() {
  const { workspaceInfo } = useWorkspaceSettings();
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>(
    'members'
  );
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const isInviteFormVisible = activeTab === 'invitations' && showInviteForm;

  useEffect(() => {
    if (activeTab === 'members') {
      setShowInviteForm(false);
    }
  }, [activeTab]);

  const members =
    workspaceInfo?.members.map((member) => ({
      email: member.user.email,
      date: new Date(member.joinedAt).toLocaleDateString(),
      role: member.role,
      userId: member.user.id,
      name: member.user.name,
      image: member.user.image,
    })) || [];

  const invitations =
    workspaceInfo?.invitations.map((invitation) => ({
      email: invitation.email,
      date: new Date(invitation.invitedAt).toLocaleDateString(),
      role: invitation.role,
      id: invitation.id,
      status: invitation.status,
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
        >
          Invite
        </Button>
      </div>

      {isInviteFormVisible && (
        <div className="mb-4 mt-2">
          <div className="rounded-lg border p-4">
            <h3 className="text-base font-medium mb-4">Invite new members</h3>
            <InviteForm
              onSubmit={(values) => {
                console.log('Invitation sent:', values);
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
                  <div className="w-8 h-8 rounded-full bg-gray-100">
                    {activeTab === 'members' && (item as any).image && (
                      <Image
                        src={(item as any).image || '/placeholder.svg'}
                        alt={(item as any).name || ''}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">
                      {activeTab === 'members'
                        ? (item as any).name
                        : item.email.split('@')[0]}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.email}
                    </div>
                  </div>
                </div>
                <div className="text-sm">{item.date}</div>
                <div>
                  <Select
                    defaultValue={item.role}
                    disabled={activeTab === 'invitations'}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-red-50">
                        {activeTab === 'members'
                          ? 'Remove member'
                          : 'Revoke invitation'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
