'use client';

import * as React from 'react';
import { Bell, Settings, MoreVertical } from 'lucide-react';

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
import { SiGooglemeet } from 'react-icons/si';
import { GrGroup } from 'react-icons/gr';
import { MdManageAccounts } from 'react-icons/md';
import { LuNotebookPen, LuNotebookTabs } from 'react-icons/lu';
import MeetingDialog from './MeetingDialog';
import WorkspaceSettingsDialog from './WorkspaceSettingsDialog';
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

interface SidebarNavProps {
  workspaceId: string;
  workspaceInfo: WorkspaceInfo;
}

const SidebarNav = ({ workspaceId, workspaceInfo }: SidebarNavProps) => {
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
                  <SiGooglemeet className="h-5 w-5" />
                  <span>Meeting</span>
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
            <WorkspaceSettingsDialog openType="accounts">
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
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
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
                      <span>{member.user.name}</span>
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
            <Button size={'sm'} className="w-6 h-6 ">
              <FaPlus className="h-3 w-3" />
            </Button>
          </SidebarMenuItem>
          <Separator />
          <SidebarGroupContent className="py-2 px-0">
            <ScrollArea className="h-[220px]">
              <SidebarMenu>
                {workspaceInfo.documents.map((document, index) => (
                  <SidebarMenuItem key={index}>
                    <SidebarMenuButton className="w-full justify-between group hover:bg-accent hover:text-accent-foreground py-5 ">
                      <div className="flex items-center gap-2">
                        {document.emoji ? (
                          document.emoji
                        ) : (
                          <LuNotebookPen className="h-5 w-5" />
                        )}
                        <span>{document.title}</span>
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
                          <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-red-50">
                            Delete
                          </DropdownMenuItem>
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
        <WorkspaceSettingsDialog openType="general">
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
