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

const accounts = [
  {
    name: 'Adam Fadilah',
    role: 'Admin',
    image: '/placeholder.svg?height=32&width=32',
  },
  {
    name: 'Michael Jr.',
    role: 'Member',
    image: '/placeholder.svg?height=32&width=32',
  },
  {
    name: 'Jayne Foster',
    role: 'Member',
    image: '/placeholder.svg?height=32&width=32',
  },
  {
    name: 'Sonaya Cruch',
    role: 'Member',
    image: '/placeholder.svg?height=32&width=32',
  },
  {
    name: 'Malik Share',
    role: 'Member',
    image: '/placeholder.svg?height=32&width=32',
  },
];

const datasets = [
  'Document 1',
  'Document 2',
  'Document 3',
  'Document 4',
  'Document 5',
  'Document 6',
];

const SidebarNav = () => {
  return (
    <Sidebar>
      <SidebarHeader className="px-4 mt-2">
        <div className="flex items-center gap-2 px-2">
          <Image src={'/images/logo.png'} alt="logo" width={32} height={32} />
          <div>
            <h2 className="text-lg font-semibold">Catatan Cerdas</h2>
          </div>
        </div>
        <div className="mt-4 px-2">
          <h3 className="text-sm text-muted-foreground mb-1">Workspace</h3>
          <p className="font-medium">👨‍💼 IT Data Analyst</p>
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
                {accounts.map((account) => (
                  <SidebarMenuItem
                    key={account.name}
                    className="flex w-full justify-between py-1.5 px-2"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={account.image} alt={account.name} />
                        <AvatarFallback>
                          {account.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{account.name}</span>
                    </div>
                    <Badge
                      variant={
                        account.role === 'Admin' ? 'default' : 'secondary'
                      }
                      className={`justify-center rounded-lg px-2 text-xs ${
                        account.role === 'Admin'
                          ? 'bg-blue-50 text-blue-500 border-blue-500 hover:bg-blue-50'
                          : 'bg-green-50 text-green-500 border-green-500 hover:bg-green-50'
                      }`}
                      style={{ width: '64px' }}
                    >
                      {account.role}
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
                {datasets.map((dataset, index) => (
                  <SidebarMenuItem key={index}>
                    <SidebarMenuButton className="w-full justify-between group hover:bg-accent hover:text-accent-foreground py-5 ">
                      <div className="flex items-center gap-2">
                        <LuNotebookPen className="h-5 w-5" />
                        <span>{dataset}</span>
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
