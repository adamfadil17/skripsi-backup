'use client';

import type React from 'react';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Settings, MoreVertical, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';

// UI Components
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Icons
import { FaPlus } from 'react-icons/fa6';
import { PiVideoConference } from 'react-icons/pi';
import { GrGroup } from 'react-icons/gr';
import { MdManageAccounts } from 'react-icons/md';
import { LuNotebookPen, LuNotebookTabs } from 'react-icons/lu';

// Components
import MeetingDialog from './MeetingDialog';
import NotificationSystem from './NotificationSystem';
import { DeleteDocument } from '@/app/workspace/[workspaceid]/[documentid]/components/DeleteDocument';
import WorkspaceSettingsDialog from './workspacesettings/WorkspaceSettingsDialog';

// Types
import type {
  WorkspaceInfo,
  WorkspaceMember,
  WorkspaceDocument,
  WorkspaceInvitation,
} from '@/types/types';
import type { User } from '@prisma/client';

// Pusher
import { usePusherChannelContext } from './PusherChannelProvider';

interface SidebarNavProps {
  workspaceId: string;
  currentUser: User;
  initialWorkspaceInfo?: WorkspaceInfo;
  initialMembers: WorkspaceMember[];
  initialDocuments: WorkspaceDocument[];
  initialInvitations: WorkspaceInvitation[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

const SidebarNav = ({
  workspaceId,
  currentUser,
  initialWorkspaceInfo,
  initialMembers,
  initialDocuments,
  initialInvitations,
  isSuperAdmin,
  isAdmin,
}: SidebarNavProps) => {
  const router = useRouter();
  const params = useParams<{ documentid: string }>();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>(initialMembers);
  const [documents, setDocuments] =
    useState<WorkspaceDocument[]>(initialDocuments);
  const [invitations, setInvitations] =
    useState<WorkspaceInvitation[]>(initialInvitations);
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(
    initialWorkspaceInfo || null
  );

  const { channel: workspaceChannel } = usePusherChannelContext();

  // Set up Pusher event listeners
  useEffect(() => {
    if (!workspaceChannel) return;

    console.log('Setting up Pusher listeners for workspace:', workspaceId);

    // Workspace events
    const handleWorkspaceUpdated = (updatedWorkspace: any) => {
      console.log(
        '🔥 EVENT RECEIVED workspace-updated in SidebarNav:',
        updatedWorkspace
      );

      // Create a new object with the updated properties to ensure React detects the change
      setWorkspaceInfo((prev) => {
        if (!prev) return updatedWorkspace;

        const updated = {
          ...prev,
          ...updatedWorkspace,
        };

        console.log('Updated workspace info:', updated);
        return updated;
      });
    };

    // Member events
    const handleMemberAdded = (member: WorkspaceMember) => {
      console.log('Pusher event received: member-added', member);
      setMembers((prev) => {
        // Check if member already exists to prevent duplicates
        const exists = prev.some((m) => m.user.id === member.user.id);
        if (exists) return prev;
        return [...prev, member];
      });
      toast.success(
        `${member.user.name || member.user.email} joined the workspace`
      );
    };

    const handleMemberRemoved = (userId: string) => {
      console.log('Pusher event received: member-removed', userId);
      setMembers((prev) => prev.filter((member) => member.user.id !== userId));

      // If current user is removed, redirect to dashboard
      if (userId === currentUser.id) {
        toast.success('You have been removed from the workspace');
        router.push('/dashboard');
      }
    };

    const handleMemberUpdated = (updatedMember: WorkspaceMember) => {
      console.log('Pusher event received: member-updated', updatedMember);
      setMembers((prev) =>
        prev.map((member) =>
          member.user.id === updatedMember.user.id ? updatedMember : member
        )
      );

      toast.success(
        `${
          updatedMember.user.name || updatedMember.user.email
        }'s role was updated`
      );
    };

    // Document events
    const handleDocumentAdded = (document: WorkspaceDocument) => {
      console.log('Pusher event received: document-added', document);
      setDocuments((prev) => {
        // Check if document already exists to prevent duplicates
        const exists = prev.some((d) => d.id === document.id);
        if (exists) return prev;
        return [document, ...prev]; // Add new document at the beginning
      });
    };

    const handleDocumentRemoved = (documentId: string) => {
      console.log('Pusher event received: document-removed', documentId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    };

    const handleDocumentUpdated = (updatedDocument: WorkspaceDocument) => {
      console.log('Pusher event received: document-updated', updatedDocument);
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === updatedDocument.id ? updatedDocument : doc
        )
      );
    };

    // Subscribe to events
    workspaceChannel.bind('workspace-updated', handleWorkspaceUpdated);
    workspaceChannel.bind('member-added', handleMemberAdded);
    workspaceChannel.bind('member-removed', handleMemberRemoved);
    workspaceChannel.bind('member-updated', handleMemberUpdated);
    workspaceChannel.bind('document-added', handleDocumentAdded);
    workspaceChannel.bind('document-removed', handleDocumentRemoved);
    workspaceChannel.bind('document-updated', handleDocumentUpdated);

    // Cleanup
    return () => {
      console.log('Cleaning up Pusher listeners');
      workspaceChannel.unbind('workspace-updated', handleWorkspaceUpdated);
      workspaceChannel.unbind('member-added', handleMemberAdded);
      workspaceChannel.unbind('member-removed', handleMemberRemoved);
      workspaceChannel.unbind('member-updated', handleMemberUpdated);
      workspaceChannel.unbind('document-added', handleDocumentAdded);
      workspaceChannel.unbind('document-removed', handleDocumentRemoved);
      workspaceChannel.unbind('document-updated', handleDocumentUpdated);
    };
  }, [workspaceChannel, workspaceId, currentUser.id, router, workspaceInfo]);

  useEffect(() => {
    console.log('workspaceInfo updated:', workspaceInfo);
  }, [workspaceInfo]);

  const handleCreateDocument = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `/api/workspace/${workspaceId}/document`,
        {
          title: 'Untitled Document',
          emoji: '📝',
          coverImage: '/images/cover.png',
        }
      );

      if (response.status === 201) {
        const newDocument = response.data.data.newDocument;
        console.log(newDocument.id);
        router.push(`/workspace/${workspaceId}/${newDocument?.id}`);
        // No need to call router.refresh() since Pusher will handle the real-time update
        toast.success('Document has been created');
      }
    } catch (error: any) {
      console.error('Failed to create document:', error);
      toast.error(
        error.response?.data?.message || 'Failed to create document.'
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId, router]);

  // If workspace info couldn't be loaded
  if (!workspaceInfo) {
    return null;
  }

  return (
    <Sidebar
      variant="sidebar"
      collapsible="offcanvas"
      className="border-r border-gray-200 z-20 shrink-0"
      style={
        {
          '--sidebar-width': '260px',
          '--sidebar-width-mobile': '260px',
        } as React.CSSProperties
      }
    >
      <SidebarHeader className="px-4 mt-2">
        <Link
          href={`/dashboard`}
          className="flex items-center gap-2 px-2 cursor-pointer"
        >
          <Image src={'/images/logo.png'} alt="logo" width={32} height={32} />
          <div>
            <h2 className="text-lg font-semibold">Catatan Cerdas</h2>
          </div>
        </Link>
        <div className="mt-4 px-2">
          <h3 className="text-sm text-muted-foreground mb-1">Workspace</h3>
          <p className="font-semibold line-clamp-2 text-ellipsis overflow-hidden">
            {workspaceInfo?.emoji} {workspaceInfo?.name}
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 hidden-scrollbar">
        <SidebarMenu>
          <SidebarMenuItem className="my-1">
            <NotificationSystem
              trigger={
                <SidebarMenuButton className="w-full justify-between text-md hover:bg-accent hover:text-accent-foreground py-5">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    <span>Notification</span>
                  </div>
                  <Badge
                    style={{
                      width: '38px',
                      height: '28px',
                      alignItems: 'center',
                    }}
                    variant="default"
                    className="justify-center bg-red-50 text-red-500 border-red-500 rounded-lg hover:bg-red-100 "
                  >
                    24
                  </Badge>
                </SidebarMenuButton>
              }
              workspaceId={workspaceId}
            />
          </SidebarMenuItem>
          <Separator />
          <SidebarMenuItem className="my-1">
            <MeetingDialog
              workspaceId={workspaceId}
              members={members}
              currentUser={currentUser}
            >
              <SidebarMenuButton className="w-full justify-between text-md hover:bg-accent hover:text-accent-foreground py-5">
                <div className="flex items-center gap-2">
                  <PiVideoConference className="h-5 w-5" />
                  <span>Meet</span>
                </div>
                <Badge
                  style={{
                    width: '38px',
                    height: '28px',
                    alignItems: 'center',
                  }}
                  variant="default"
                  className="justify-center bg-gray-50 text-gray-500 border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  10
                </Badge>
              </SidebarMenuButton>
            </MeetingDialog>
          </SidebarMenuItem>
          <Separator />
        </SidebarMenu>

        <SidebarGroup className="py-0 px-0 my-0 mx-0">
          <SidebarMenuItem className="flex w-full justify-between py-2 px-2 mb-1">
            <div className="flex items-center gap-2">
              <span>
                <GrGroup className="h-5 w-5" />
              </span>
              <span>Accounts</span>
            </div>
            <WorkspaceSettingsDialog
              openType="accounts"
              workspaceInfo={workspaceInfo}
              isSuperAdmin={isSuperAdmin}
              isAdmin={isAdmin}
              currentUser={currentUser}
              initialMembers={members}
              initialInvitations={invitations}
            >
              <Button size={'sm'} className="w-6 h-6 ">
                <MdManageAccounts className="h-3 w-3" />
              </Button>
            </WorkspaceSettingsDialog>
          </SidebarMenuItem>
          <Separator />
          <SidebarGroupContent className="py-2 px-0">
            <ScrollArea className="h-[160px]">
              <SidebarMenu>
                {members.map((member) => (
                  <SidebarMenuItem
                    key={member.id}
                    className="flex w-full justify-between py-1.5 px-2"
                  >
                    <div className="flex items-center gap-2 max-w-[120px]">
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarImage
                          src={
                            member.user.image || '/images/avatarplaceholder.png'
                          }
                          alt={member.user.name || 'avatar'}
                        />
                        <AvatarFallback>
                          {member.user.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{member.user.name}</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`justify-center rounded-lg px-2 text-xs ${
                        member.role === 'SUPER_ADMIN'
                          ? 'bg-purple-50 text-purple-500 border-purple-500 hover:bg-purple-50'
                          : member.role === 'ADMIN'
                          ? 'bg-blue-50 text-blue-500 border-blue-500 hover:bg-blue-50'
                          : 'bg-green-50 text-green-500 border-green-500 hover:bg-green-50'
                      }`}
                      style={{ width: '64px' }}
                    >
                      {member.role === 'SUPER_ADMIN'
                        ? 'Owner'
                        : member.role === 'ADMIN'
                        ? 'Admin'
                        : 'Member'}
                    </Badge>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-0 px-0 my-0 mx-0">
          <SidebarMenuItem className="flex w-full justify-between py-2 px-2 mb-1">
            <div className="flex items-center gap-2">
              <LuNotebookTabs className="h-5 w-5" />
              <span>Documents</span>
            </div>
            <Button
              size={'sm'}
              className="w-6 h-6 "
              onClick={handleCreateDocument}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <FaPlus className="h-3 w-3" />
              )}
            </Button>
          </SidebarMenuItem>
          <Separator />
          <SidebarGroupContent className="py-2 px-0">
            <ScrollArea className="h-[220px]">
              <SidebarMenu>
                {documents.map((document) => (
                  <SidebarMenuItem
                    key={document.id}
                    onClick={() =>
                      router.push(`/workspace/${workspaceId}/${document.id}`)
                    }
                  >
                    <SidebarMenuButton
                      className={`w-full justify-between group hover:bg-accent hover:text-accent-foreground py-5 ${
                        document.id === params?.documentid &&
                        'w-full bg-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 max-w-[160px]">
                        {document.emoji ? (
                          document.emoji
                        ) : (
                          <LuNotebookPen className="h-5 w-5 flex-shrink-0" />
                        )}
                        <span className="truncate">{document.title}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div
                            className="h-7 w-7 rounded-md p-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-full w-full" />
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" side="right">
                          <DropdownMenuItem className="cursor-pointer">
                            Rename
                          </DropdownMenuItem>
                          <DeleteDocument
                            workspaceId={workspaceId}
                            document={document}
                          >
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive focus:bg-red-50 cursor-pointer"
                              onSelect={(e) => {
                                e.preventDefault();
                              }}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DeleteDocument>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t mt-auto p-4">
        <WorkspaceSettingsDialog
          openType="general"
          workspaceInfo={workspaceInfo}
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
          currentUser={currentUser}
          initialMembers={members}
          initialInvitations={invitations}
        >
          <span>
            <Button className="w-full" size="lg">
              <Settings className="mr-2 h-5 w-5" />
              Settings
            </Button>
          </span>
        </WorkspaceSettingsDialog>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};

export default SidebarNav;
