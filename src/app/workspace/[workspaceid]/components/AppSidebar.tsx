'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  ChevronsUpDown,
  Settings,
  MoreVertical,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar';

// Icons
import { PiVideoConference } from 'react-icons/pi';
import { GrGroup } from 'react-icons/gr';
import { MdManageAccounts } from 'react-icons/md';
import { LuNotebookPen, LuNotebookTabs } from 'react-icons/lu';
import { FaPlus } from 'react-icons/fa';

import type {
  WorkspaceInfo,
  WorkspaceMember,
  WorkspaceDocument,
  WorkspaceInvitation,
  UserWorkspace,
} from '@/types/types';
import type { User } from '@prisma/client';
import Image from 'next/image';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import { usePusherChannelContext } from './PusherChannelProvider';
import MeetingDialog from './MeetingDialog';
import WorkspaceSettingsDialog from './workspacesettings/WorkspaceSettingsDialog';
import { DeleteDocument } from '../[documentid]/components/DeleteDocument';
import Link from 'next/link';

// Available versions
const versions = ['1.0.0', '1.1.0', '2.0.0-beta'];

// Dummy data for members
// const members = [
//   {
//     id: '1',
//     user: {
//       id: '1',
//       name: 'John Doe',
//       email: 'john@example.com',
//       image: '/placeholder.svg?height=32&width=32',
//     },
//     role: 'SUPER_ADMIN',
//   },
//   {
//     id: '2',
//     user: {
//       id: '2',
//       name: 'Jane Smith',
//       email: 'jane@example.com',
//       image: '/placeholder.svg?height=32&width=32',
//     },
//     role: 'ADMIN',
//   },
//   {
//     id: '3',
//     user: {
//       id: '3',
//       name: 'Bob Johnson',
//       email: 'bob@example.com',
//       image: '/placeholder.svg?height=32&width=32',
//     },
//     role: 'MEMBER',
//   },
//   {
//     id: '4',
//     user: {
//       id: '4',
//       name: 'Alice Williams',
//       email: 'alice@example.com',
//       image: '/placeholder.svg?height=32&width=32',
//     },
//     role: 'MEMBER',
//   },
//   {
//     id: '5',
//     user: {
//       id: '5',
//       name: 'Charlie Brown',
//       email: 'charlie@example.com',
//       image: '/placeholder.svg?height=32&width=32',
//     },
//     role: 'MEMBER',
//   },
// ];

// Dummy data for documents
// const documents = [
//   {
//     id: '1',
//     title: 'Project Roadmap',
//     emoji: '📘',
//   },
//   {
//     id: '2',
//     title: 'Meeting Notes',
//     emoji: '📝',
//   },
//   {
//     id: '3',
//     title: 'Budget Planning',
//     emoji: '💰',
//   },
//   {
//     id: '4',
//     title: 'Marketing Strategy',
//     emoji: '📊',
//   },
//   {
//     id: '5',
//     title: 'Product Requirements',
//     emoji: '📋',
//   },
//   {
//     id: '6',
//     title: 'Product Requirements',
//     emoji: '📋',
//   },
// ];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  workspaceId: string;
  currentUser: User;
  workspaces: UserWorkspace[];
  initialWorkspaceInfo?: WorkspaceInfo;
  initialMembers: WorkspaceMember[];
  initialDocuments: WorkspaceDocument[];
  initialInvitations: WorkspaceInvitation[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

export function AppSidebar({
  workspaceId,
  currentUser,
  workspaces,
  initialWorkspaceInfo,
  initialMembers,
  initialDocuments,
  initialInvitations,
  isSuperAdmin,
  isAdmin,
  ...props
}: AppSidebarProps) {
  const router = useRouter();
  const params = useParams<{ documentid: string }>();
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<UserWorkspace | null>(null);
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

  useEffect(() => {
    if (workspaces.length > 0) {
      const currentWorkspace = workspaces.find(
        (w) => w.id === workspaceInfo?.id
      );
      setSelectedWorkspace(currentWorkspace || workspaces[0]);
    } else if (workspaceInfo) {
      // Fallback to the provided workspaceInfo if no workspaces are available
      setSelectedWorkspace({
        id: workspaceInfo.id || '',
        name: workspaceInfo.name || '',
        emoji: workspaceInfo.emoji || '',
        coverImage: '',
        documentCount: 0,
        members: [],
      });
    }
  }, [workspaces, workspaceInfo]);

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
    };

    const handleMemberRemoved = (userId: string) => {
      console.log('Pusher event received: member-removed', userId);
      setMembers((prev) => prev.filter((member) => member.user.id !== userId));
    };

    const handleMemberLeaved = (userId: string) => {
      console.log('Pusher event received: member-leaved', userId);
      setMembers((prev) => prev.filter((member) => member.user.id !== userId));

      // If current user is removed, redirect to dashboard
      if (userId === currentUser.id) {
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
    workspaceChannel.bind('member-leaved', handleMemberLeaved);
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
      workspaceChannel.unbind('member-leaved', handleMemberLeaved);
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

  const handleWorkspaceChange = (workspace: UserWorkspace) => {
    setSelectedWorkspace(workspace);
    // Navigate to the selected workspace with the current document
    router.push(`/workspace/${workspace.id}`);
  };

  return (
    <Sidebar
      {...props}
      className="border-r border-gray-100 z-50 shrink-0 md:flex"
      collapsible="offcanvas"
      variant="sidebar"
    >
      <SidebarHeader className="px-4 mt-2">
        {/* Logo and App Name */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-2 cursor-pointer mb-4"
        >
          <Image src={'/images/logo.png'} alt="logo" width={32} height={32} />
          <div>
            <h2 className="text-lg font-semibold">Catatan Cerdas</h2>
          </div>
        </Link>

        {/* Version Switcher */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <span className="font-bold">
                      {selectedWorkspace?.emoji || workspaceInfo.emoji}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold truncate">
                      {selectedWorkspace?.name || workspaceInfo.name}
                    </span>
                    <span className="text-xs text-sidebar-foreground/70">
                      {selectedWorkspace?.documentCount || 0} documents
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width]"
                align="start"
              >
                {workspaces.length > 0 ? (
                  workspaces.map((workspace) => (
                    <DropdownMenuItem
                      key={workspace.id}
                      onSelect={() => handleWorkspaceChange(workspace)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span>{workspace.emoji}</span>
                        <span className="truncate">{workspace.name}</span>
                        {workspace.id === selectedWorkspace?.id && (
                          <Check className="ml-auto size-4" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>
                    No workspaces available
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-4 flex flex-col flex-1">
        {/* Meeting Section */}
        <SidebarMenu>
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
                  variant="secondary"
                  className="justify-center bg-gray-50 text-gray-500 border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  10
                </Badge>
              </SidebarMenuButton>
            </MeetingDialog>
          </SidebarMenuItem>
          <Separator />
        </SidebarMenu>

        {/* Accounts Section */}
        <SidebarGroup className="py-0 px-0 my-0 mx-0">
          <SidebarMenuItem className="flex w-full justify-between py-2 px-2 mb-1">
            <div className="flex items-center gap-2">
              <GrGroup className="h-5 w-5" />
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
              <Button size="sm" className="w-6 h-6">
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
                          src={member.user.image || '/placeholder.svg'}
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

        {/* Documents Section */}
        <SidebarGroup className="py-0 px-0 my-0 mx-0 flex flex-col flex-1">
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
          <SidebarGroupContent className="py-2 px-0 flex flex-1">
            <ScrollArea className="flex-1 h-full">
              <SidebarMenu>
                {documents.map((document) => (
                  <SidebarMenuItem key={document.id}>
                    <Link
                      href={`/workspace/${workspaceId}/${document.id}`}
                      className="w-full"
                    >
                      <SidebarMenuButton
                        className={`w-full justify-between group hover:bg-accent hover:text-accent-foreground py-5 ${
                          document.id === params?.documentid &&
                          'w-full bg-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 max-w-[160px]">
                          {document.emoji ? (
                            <span>{document.emoji}</span>
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
                              Share
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
                    </Link>
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
}
