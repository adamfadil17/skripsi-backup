'use client';

import React, { type ReactNode, useEffect, useState } from 'react';
import {
  MoreHorizontal,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { LuSmilePlus } from 'react-icons/lu';
import { GrGroup } from 'react-icons/gr';
import { Badge } from '../ui/badge';
import Image from 'next/image';
import { CoverPickerPopover } from './CoverPickerPopover';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { InviteForm } from './InviteForm';

interface Member {
  email: string;
  date: string;
  role: 'Admin' | 'Member';
}

interface Invitation {
  email: string;
  date: string;
  role: 'Admin' | 'Member';
}

const workspaceFormSchema = z.object({
  workspaceName: z
    .string()
    .min(1, { message: 'Workspace name is required' })
    .max(50, 'Workspace name must be 50 characters or less'),
  emoji: z.string().optional(),
  coverImage: z.string().default('/images/cover.png'),
});

interface WorkspaceSettingsDialogProps {
  openType: 'accounts' | 'general';
  children: ReactNode;
}

export const WorkspaceSettingsDialog = ({
  openType,
  children,
}: WorkspaceSettingsDialogProps) => {
  const [currentMenu, setCurrentMenu] = useState<'general' | 'accounts'>(
    'general'
  );
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>(
    'members'
  );
  const [isEditing, setIsEditing] = useState(false);
  const [emoji, setEmoji] = useState<string>();
  const [workspaceName, setWorkspaceName] = useState('IT Data Analyst');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const isInviteFormVisible = activeTab === 'invitations' && showInviteForm;
  // const [inviteEmail, setInviteEmail] = useState('');
  // const [inviteRole, setInviteRole] = useState<'Admin' | 'Member'>('Admin');
  const [currentPage, setCurrentPage] = useState(1);
  const [coverImage, setCoverImage] = useState('/images/cover.png');

  const editWorkspaceForm = useForm<z.infer<typeof workspaceFormSchema>>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: {
      workspaceName: workspaceName, // Update 4
      emoji: emoji, // Update 4
      coverImage: coverImage, // Update 4
    },
  });

  useEffect(() => {
    if (activeTab === 'members') {
      setShowInviteForm(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setCurrentMenu(openType);
  }, [openType]);

  useEffect(() => {
    editWorkspaceForm.reset({
      workspaceName: workspaceName,
      emoji: emoji,
      coverImage: coverImage,
    });
  }, [isEditing]);

  function onEditWorkspaceSubmit(values: z.infer<typeof workspaceFormSchema>) {
    console.log(values);
    setIsEditing(false);
    setWorkspaceName(values.workspaceName); // Update 2
    setCoverImage(values.coverImage); // Update 2
    // Handle other form submission logic here
  }

  const [members] = useState<Member[]>([
    { email: 'adam.fadilah17@gmail.com', date: '3/8/2024', role: 'Admin' },
    { email: 'michaeljr@gmail.com', date: '3/8/2024', role: 'Member' },
    { email: 'jaynefoster@gmail.com', date: '3/8/2024', role: 'Member' },
    { email: 'sonayacruch@gmail.com', date: '3/8/2024', role: 'Member' },
    { email: 'johndoe@gmail.com', date: '3/9/2024', role: 'Member' },
    { email: 'janedoe@gmail.com', date: '3/9/2024', role: 'Member' },
    { email: 'bobsmith@gmail.com', date: '3/10/2024', role: 'Member' },
    { email: 'alicejohnson@gmail.com', date: '3/10/2024', role: 'Member' },
  ]);

  const [invitations] = useState<Invitation[]>([
    { email: 'jacobjenner12@gmail.com', date: '3/8/2024', role: 'Admin' },
    { email: 'chris.thompson@gmail.com', date: '3/8/2024', role: 'Member' },
    { email: 'sarahparker@gmail.com', date: '3/9/2024', role: 'Member' },
    { email: 'mikebrown@gmail.com', date: '3/9/2024', role: 'Member' },
    { email: 'emilydavis@gmail.com', date: '3/10/2024', role: 'Member' },
    { email: 'davidwilson@gmail.com', date: '3/10/2024', role: 'Member' },
  ]);

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
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-[880px] p-0">
        <div className="flex h-[700px]">
          <div className="w-[240px] border-r p-4 space-y-2">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Workspace</h2>
              <p className="text-sm text-muted-foreground">
                Manage your workspace.
              </p>
            </div>
            <div className="space-y-1">
              <Button
                variant={currentMenu === 'general' ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
                onClick={() => setCurrentMenu('general')}
              >
                <Building2 className="h-4 w-4" />
                General
              </Button>
              <Button
                variant={currentMenu === 'accounts' ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
                onClick={() => setCurrentMenu('accounts')}
              >
                <GrGroup className="h-4 w-4" />
                Accounts
              </Button>
            </div>
          </div>

          <div className="flex-1">
            <DialogHeader className="px-6 py-4 flex-row items-center justify-between border-b">
              <DialogTitle>
                {currentMenu === 'general' ? 'General' : 'Accounts'}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6">
              {currentMenu === 'general' ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-4">
                      Workspace Profile
                    </h3>
                    {isEditing ? (
                      <div className="space-y-4 border rounded-lg p-4">
                        <Form {...editWorkspaceForm}>
                          <form
                            onSubmit={editWorkspaceForm.handleSubmit(
                              onEditWorkspaceSubmit
                            )}
                          >
                            <FormField
                              control={editWorkspaceForm.control}
                              name="coverImage"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="sr-only">
                                    Cover Image
                                  </FormLabel>
                                  <FormControl>
                                    <div>
                                      <p className="text-sm font-medium mb-2">
                                        Cover
                                      </p>
                                      <div className="flex items-center gap-4">
                                        <Image
                                          src={field.value}
                                          alt="cover"
                                          width={200}
                                          height={200}
                                          className="w-[120px] h-[60px] rounded-xl object-cover"
                                        />
                                        <CoverPickerPopover
                                          currentCover={field.value}
                                          setCover={field.onChange}
                                        >
                                          <Button variant="outline" size="sm">
                                            Change
                                          </Button>
                                        </CoverPickerPopover>
                                      </div>
                                    </div>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <div className="flex items-start gap-3 mt-4">
                              <div className="flex-1">
                                <FormField
                                  control={editWorkspaceForm.control}
                                  name="workspaceName"
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormLabel className="sr-only">
                                        Workspace Name
                                      </FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="Workspace name"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={editWorkspaceForm.control}
                                name="emoji"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="sr-only">
                                      Emoji
                                    </FormLabel>
                                    <FormControl>
                                      <EmojiPickerPopover
                                        setEmoji={field.onChange}
                                        type="document"
                                      >
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8 sm:h-10 sm:w-10"
                                        >
                                          {field.value ? (
                                            field.value
                                          ) : (
                                            <LuSmilePlus className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </EmojiPickerPopover>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                              <Button
                                variant="outline"
                                onClick={() => setIsEditing(false)}
                              >
                                Cancel
                              </Button>
                              <Button type="submit">Save</Button>
                            </div>
                          </form>
                        </Form>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Image
                            src={coverImage || '/images/placeholder.svg'}
                            alt="cover"
                            width={200}
                            height={200}
                            className="w-[120px] h-[60px] rounded-xl object-cover"
                          />
                          <span>{workspaceName}</span>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setIsEditing(true)}
                        >
                          Update Profile
                        </Button>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      Leave workspace
                    </h3>
                    <Button
                      variant="ghost"
                      className="text-red-500 hover:text-red-500 hover:bg-red-100 justify-start px-3 h-auto"
                    >
                      Leave workspace
                    </Button>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      Delete workspace
                    </h3>
                    <Button
                      variant="ghost"
                      className="text-red-500 hover:text-red-500 hover:bg-red-100 justify-start px-3 h-auto"
                    >
                      Delete workspace
                    </Button>
                  </div>
                </div>
              ) : (
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
                        <h3 className="text-base font-medium mb-4">
                          Invite new members
                        </h3>
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
                          <div>
                            {activeTab === 'members' ? 'Joined' : 'Invited'}
                          </div>
                          <div>Role</div>
                          <div />
                        </div>
                        {paginatedData.map((item) => (
                          <div
                            key={item.email}
                            className="grid grid-cols-[1fr_120px_120px_40px] gap-4 items-center py-3 border-t"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100" />
                              <div>
                                <div className="font-medium">
                                  {item.email.split('@')[0]}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {item.email}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm">{item.date}</div>
                            <div>
                              <Select defaultValue={item.role}>
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Admin">Admin</SelectItem>
                                  <SelectItem value="Member">Member</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
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
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
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
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
