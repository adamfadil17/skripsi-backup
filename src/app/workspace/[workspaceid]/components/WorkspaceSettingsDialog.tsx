'use client';

import { type ReactNode, useEffect, useState, useRef } from 'react';
import {
  MoreHorizontal,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

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
import { LuSmilePlus } from 'react-icons/lu';
import { GrGroup } from 'react-icons/gr';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
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
} from '@/components/ui/form';
import InviteForm from './InviteForm';
import type { WorkspaceInfo } from '@/types/types';
import coverOptions from '@/lib/coveroptions';
import { cn } from '@/lib/utils';

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
  workspaceInfo: WorkspaceInfo;
  children: ReactNode;
}

const WorkspaceSettingsDialog = ({
  openType,
  workspaceInfo,
  children,
}: WorkspaceSettingsDialogProps) => {
  const [currentMenu, setCurrentMenu] = useState<'general' | 'accounts'>(
    'general'
  );
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>(
    'members'
  );
  const [isEditing, setIsEditing] = useState(false);
  const [emoji, setEmoji] = useState<string>(workspaceInfo?.emoji || '');
  const [workspaceName, setWorkspaceName] = useState(workspaceInfo?.name || '');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const isInviteFormVisible = activeTab === 'invitations' && showInviteForm;
  const [currentPage, setCurrentPage] = useState(1);
  const [coverImage, setCoverImage] = useState(
    workspaceInfo?.coverImage || '/images/placeholder.svg'
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const editWorkspaceForm = useForm<z.infer<typeof workspaceFormSchema>>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: {
      workspaceName: workspaceInfo?.name || '',
      emoji: workspaceInfo?.emoji || '',
      coverImage: workspaceInfo?.coverImage || '/images/placeholder.svg',
    },
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = container.clientWidth;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

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

  // Close emoji picker when currentMenu changes
  useEffect(() => {
    setShowEmojiPicker(false);
  }, [currentMenu]);

  function onEditWorkspaceSubmit(values: z.infer<typeof workspaceFormSchema>) {
    console.log(values);
    setIsEditing(false);
    setWorkspaceName(values.workspaceName);
    setCoverImage(values.coverImage);
    setEmoji(values.emoji || '');
  }

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
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={cn(
          'p-0 overflow-hidden',
          showEmojiPicker ? 'max-w-[1230px]' : 'max-w-[880px]'
        )}
      >
        <div className="flex h-[700px]">
          <div
            className={cn(
              'flex h-full',
              showEmojiPicker ? 'w-[880px]' : 'flex-1'
            )}
          >
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
                  onClick={() => {
                    setCurrentMenu('general');
                    setShowEmojiPicker(false);
                  }}
                >
                  <Building2 className="h-4 w-4" />
                  General
                </Button>
                <Button
                  variant={currentMenu === 'accounts' ? 'secondary' : 'ghost'}
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setCurrentMenu('accounts');
                    setShowEmojiPicker(false);
                  }}
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
                                        <div className="mb-4">
                                          <Image
                                            src={
                                              field.value || '/placeholder.svg'
                                            }
                                            alt="cover"
                                            width={200}
                                            height={200}
                                            className="w-[120px] h-[60px] rounded-xl object-cover"
                                          />
                                        </div>

                                        <div className="mt-4">
                                          <div className="relative h-[100px]">
                                            <div className="absolute inset-0">
                                              <div className="relative h-full">
                                                <div
                                                  ref={scrollContainerRef}
                                                  className="flex items-center gap-2 px-1 absolute inset-0 overflow-hidden"
                                                >
                                                  {coverOptions.map(
                                                    (cover, index) => (
                                                      <button
                                                        key={index}
                                                        type="button"
                                                        onClick={() =>
                                                          field.onChange(
                                                            cover.imageUrl
                                                          )
                                                        }
                                                        className={`relative w-[140px] h-[84px] rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                                                          field.value ===
                                                            cover.imageUrl &&
                                                          'ring-2 ring-primary ring-offset-2'
                                                        }`}
                                                      >
                                                        <Image
                                                          src={
                                                            cover.imageUrl ||
                                                            '/images/placeholder.svg' ||
                                                            '/placeholder.svg' ||
                                                            '/placeholder.svg' ||
                                                            '/placeholder.svg'
                                                          }
                                                          alt={`Cover option ${
                                                            index + 1
                                                          }`}
                                                          fill
                                                          className="object-cover"
                                                        />
                                                      </button>
                                                    )
                                                  )}
                                                </div>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 hover:bg-background/90 backdrop-blur-sm z-50"
                                                  onClick={() => scroll('left')}
                                                >
                                                  <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 hover:bg-background/90 backdrop-blur-sm z-50"
                                                  onClick={() =>
                                                    scroll('right')
                                                  }
                                                >
                                                  <ChevronRight className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
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
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8 sm:h-10 sm:w-10"
                                          onClick={() =>
                                            setShowEmojiPicker(!showEmojiPicker)
                                          }
                                        >
                                          {field.value ? (
                                            field.value
                                          ) : (
                                            <LuSmilePlus className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="flex justify-end gap-3 mt-6">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setIsEditing(false);
                                    setShowEmojiPicker(false);
                                  }}
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
                            <div className="flex items-center gap-2">
                              {emoji && (
                                <span className="text-xl">{emoji}</span>
                              )}
                              <span>{workspaceName}</span>
                            </div>
                          </div>
                          <Button
                            type="button"
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
                        type="button"
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
                        type="button"
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
                              key={
                                activeTab === 'members'
                                  ? (item as any).userId
                                  : (item as any).id
                              }
                              className="grid grid-cols-[1fr_120px_120px_40px] gap-4 items-center py-3 border-t"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-100">
                                  {activeTab === 'members' &&
                                    (item as any).image && (
                                      <Image
                                        src={
                                          (item as any).image ||
                                          '/images/placeholder.svg'
                                        }
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
                                    <SelectItem value="SUPER_ADMIN">
                                      Super Admin
                                    </SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="MEMBER">
                                      Member
                                    </SelectItem>
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
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
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

          {showEmojiPicker && (
            <div className="w-[350px] border-l mt-5">
              <div
                className="p-6 h-full overflow-auto"
                style={{
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch',
                }}
                onWheel={(e) => {
                  // Ensure wheel events propagate properly
                  e.stopPropagation();
                }}
              >
                <Picker
                  data={data}
                  onEmojiSelect={(emoji: any) => {
                    editWorkspaceForm.setValue('emoji', emoji.native);
                    setShowEmojiPicker(false);
                  }}
                  theme="light"
                  previewPosition="none"
                  perLine={8}
                  maxFrequentRows={0}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceSettingsDialog;
