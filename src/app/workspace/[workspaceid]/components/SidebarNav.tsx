'use client';

import { useState } from 'react';
import { Bell, Settings, MoreVertical, Loader2 } from 'lucide-react';

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
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { FaPlus } from 'react-icons/fa6';
import { PiVideoConference } from 'react-icons/pi';
import { GrGroup } from 'react-icons/gr';
import { MdManageAccounts } from 'react-icons/md';
import { LuNotebookPen, LuNotebookTabs } from 'react-icons/lu';
import MeetingDialog from './MeetingDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import NotificationSystem from './NotificationSystem';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { WorkspaceInfo } from '@/types/types';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { DeleteDocument } from '../[documentid]/components/DeleteDocument';
import WorkspaceSettingsDialog from './workspacesettings/WorkspaceSettingsDialog';
import { User } from '@prisma/client';
import toast from 'react-hot-toast';

interface SidebarNavProps {
  workspaceId: string;
  workspaceInfo: WorkspaceInfo;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  currentUser: User;
}

const SidebarNav = ({
  workspaceId,
  workspaceInfo,
  isSuperAdmin,
  isAdmin,
  currentUser,
}: SidebarNavProps) => {
  const router = useRouter();
  const params = useParams<{ documentid: string }>();
  const [loading, setLoading] = useState(false);

  const handleCreateDocument = async () => {
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
        const newDocument = response.data;
        console.log(newDocument.id);
        router.push(`/workspace/${workspaceId}/${newDocument.id}`);
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
  };

  return (
    <Sidebar>
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
          <p className="font-medium">
            {workspaceInfo.emoji} {workspaceInfo.name}
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
            />
          </SidebarMenuItem>
          <Separator />
          <SidebarMenuItem className="my-1">
            <MeetingDialog>
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
                {workspaceInfo.members.map((member) => (
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
                {workspaceInfo.documents.map((document, index) => (
                  <SidebarMenuItem
                    key={index}
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
                          <div className="h-7 w-7 rounded-md p-1">
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

      <div className="border-t mt-auto p-4">
        <WorkspaceSettingsDialog
          openType="general"
          workspaceInfo={workspaceInfo}
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
          currentUser={currentUser}
        >
          <span>
            <Button className="w-full" size="lg">
              <Settings className="mr-2 h-5 w-5" />
              Settings
            </Button>
          </span>
        </WorkspaceSettingsDialog>
      </div>
    </Sidebar>
  );
};

export default SidebarNav;
