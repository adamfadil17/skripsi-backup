'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { LuSmilePlus } from 'react-icons/lu';
import Image from 'next/image';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import coverOptions from '@/lib/cover-options';
import {
  useWorkspaceSettings,
  type WorkspaceFormValues,
} from './WorkspaceSettingsProvider';
import { usePusherChannel } from '@/hooks/use-pusher-channel';
import type { WorkspaceMember } from '@/types/types';
import { usePusherChannelContext } from '../PusherChannelProvider';

export function WorkspaceGeneralSettings() {
  const {
    modalState,
    toggleModalState,
    emoji,
    setEmoji,
    workspaceName,
    setWorkspaceName,
    coverImage,
    setCoverImage,
    showEmojiPicker,
    setShowEmojiPicker,
    editWorkspaceForm,
    workspaceInfo,
    isSuperAdmin,
  } = useWorkspaceSettings();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const { channel: workspaceChannel } = usePusherChannelContext();

  // Set up Pusher event listeners
  useEffect(() => {
    if (!workspaceChannel) return;

    // Listen for workspace updates
    const handleWorkspaceUpdated = (updatedWorkspace: any) => {
      console.log('Pusher event received: workspace-updated', updatedWorkspace);
      setWorkspaceName(updatedWorkspace.name);
      setCoverImage(updatedWorkspace.coverImage);
      setEmoji(updatedWorkspace.emoji);
    };

    // Listen for workspace deletion
    const handleWorkspaceDeleted = (deletedWorkspaceId: string) => {
      console.log(
        'Pusher event received: workspace-deleted',
        deletedWorkspaceId
      );
      if (deletedWorkspaceId === workspaceInfo.id) {
        toast.success('Workspace has been deleted');
        router.push('/dashboard');
      }
    };

    // Subscribe to events
    workspaceChannel.bind('workspace-updated', handleWorkspaceUpdated);
    workspaceChannel.bind('workspace-deleted', handleWorkspaceDeleted);

    // Cleanup
    return () => {
      workspaceChannel.unbind('workspace-updated', handleWorkspaceUpdated);
      workspaceChannel.unbind('workspace-deleted', handleWorkspaceDeleted);
    };
  }, [
    workspaceChannel,
    setWorkspaceName,
    setCoverImage,
    setEmoji,
    workspaceInfo.id,
    router,
  ]);

  useEffect(() => {
    editWorkspaceForm.reset({
      workspaceName: workspaceName,
      emoji: emoji,
      coverImage: coverImage,
    });
  }, [
    modalState.isEditing,
    workspaceName,
    emoji,
    coverImage,
    editWorkspaceForm,
  ]);

  const onEditWorkspaceSubmit = useCallback(
    async (values: WorkspaceFormValues) => {
      setIsSubmitting(true);
      try {
        const response = await axios.put(`/api/workspace/${workspaceInfo.id}`, {
          name: values.workspaceName,
          emoji: values.emoji,
          coverImage: values.coverImage,
        });

        if (response.status === 200) {
          // Update local state
          setWorkspaceName(values.workspaceName);
          setCoverImage(values.coverImage);
          setEmoji(values.emoji || '💼');
          toggleModalState('isEditing', false);

          // Log the complete response for debugging
          console.log(
            'Workspace updated successfully. Response:',
            response.data
          );
          console.log(
            'Pusher should broadcast workspace-updated event with:',
            response.data.data.workspace || response.data.data.updatedWorkspace
          );

          toast.success('Workspace Profile has been updated');
        }
      } catch (error: any) {
        console.error('Error updating workspace:', error);
        toast.error(
          error.response?.data?.message || 'Failed to update workspace'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      workspaceInfo.id,
      setWorkspaceName,
      setCoverImage,
      setEmoji,
      toggleModalState,
    ]
  );

  const scroll = useCallback((direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = container.clientWidth;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-4">Workspace Profile</h3>
        {modalState.isEditing ? (
          <div className="space-y-4 border rounded-lg p-4">
            <Form {...editWorkspaceForm}>
              <form
                onSubmit={editWorkspaceForm.handleSubmit(onEditWorkspaceSubmit)}
              >
                <FormField
                  control={editWorkspaceForm.control}
                  name="coverImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">Cover Image</FormLabel>
                      <FormControl>
                        <div>
                          <p className="text-sm font-medium mb-2">Cover</p>
                          <div className="mb-4">
                            <Image
                              src={field.value || '/images/placeholder.svg'}
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
                                    {coverOptions.map((cover, index) => (
                                      <button
                                        key={index}
                                        type="button"
                                        onClick={() =>
                                          field.onChange(cover.imageUrl)
                                        }
                                        className={`relative w-[140px] h-[84px] rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                                          field.value === cover.imageUrl &&
                                          'ring-2 ring-primary ring-offset-2'
                                        }`}
                                      >
                                        <Image
                                          src={
                                            cover.imageUrl || '/images/placeholder.svg'
                                          }
                                          alt={`Cover option ${index + 1}`}
                                          fill
                                          className="object-cover"
                                        />
                                      </button>
                                    ))}
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
                                    onClick={() => scroll('right')}
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
                            <Input placeholder="Workspace name" {...field} />
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
                        <FormLabel className="sr-only">Emoji</FormLabel>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 sm:h-10 sm:w-10"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
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
                      toggleModalState('isEditing', false);
                      setShowEmojiPicker(false);
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update'
                    )}
                  </Button>
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
                {emoji && <span className="text-xl">{emoji}</span>}
                <span>{workspaceName}</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!isSuperAdmin}
              onClick={() => toggleModalState('isEditing', true)}
            >
              Update Profile
            </Button>
          </div>
        )}
      </div>
      <WorkspaceLeaveSection />
      <WorkspaceDeleteSection />
    </div>
  );
}

function WorkspaceLeaveSection() {
  const {
    modalState,
    toggleModalState,
    workspaceName,
    workspaceInfo,
    isSuperAdmin,
  } = useWorkspaceSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [superAdminCount, setSuperAdminCount] = useState(0);
  const router = useRouter();

  // Fetch the super admin count when needed
  useEffect(() => {
    if (modalState.showLeaveConfirmation) {
      const fetchSuperAdminCount = async () => {
        try {
          const response = await axios.get(
            `/api/workspace/${workspaceInfo.id}/member`
          );
          if (response.data.status === 'success') {
            const members = response.data.data.members;
            const count = members.filter(
              (m: WorkspaceMember) => m.role === 'SUPER_ADMIN'
            ).length;
            setSuperAdminCount(count);
          }
        } catch (error) {
          console.error('Failed to fetch members:', error);
        }
      };

      fetchSuperAdminCount();
    }
  }, [modalState.showLeaveConfirmation, workspaceInfo.id]);

  const handleLeave = useCallback(async () => {
    try {
      if (superAdminCount === 1 && isSuperAdmin) {
        toast.error(
          'You are the last Owner. Please assign a new Owner before leaving.'
        );
        return;
      }

      setIsSubmitting(true);

      const res = await axios.delete(
        `/api/workspace/${workspaceInfo.id}/leave`
      );

      if (res.data.status === 'success') {
        toast.success(
          res.data.message || 'You have successfully left the workspace'
        );
        router.push('/dashboard');
      } else {
        toast.error(res.data.message || 'Failed to leave workspace');
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'An unexpected error occurred.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [superAdminCount, isSuperAdmin, workspaceInfo.id, router]);

  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Leave workspace</h3>
      {modalState.showLeaveConfirmation ? (
        <div className="border rounded-lg p-4 space-y-4">
          <p className="text-sm">
            Are you sure you want to leave "{workspaceName}"? You will lose
            access to all documents and collaborations within this workspace.
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => toggleModalState('showLeaveConfirmation', false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleLeave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Leaving...
                </>
              ) : (
                'Leave'
              )}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className="text-red-500 hover:text-red-500 hover:bg-red-100 justify-start px-3 h-auto"
          onClick={() => toggleModalState('showLeaveConfirmation', true)}
        >
          Leave workspace
        </Button>
      )}
    </div>
  );
}

function WorkspaceDeleteSection() {
  const {
    modalState,
    toggleModalState,
    workspaceName,
    workspaceInfo,
    isSuperAdmin,
  } = useWorkspaceSettings();

  const router = useRouter();

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    try {
      setIsDeleting(true);

      const response = await axios.delete(`/api/workspace/${workspaceInfo.id}`);

      if (response.data.status === 'success') {
        toast.success(response.data.message || 'Workspace has been deleted');
        router.push('/dashboard');
      } else {
        toast.error(response.data.message || 'Failed to delete workspace');
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'An unexpected error occurred.';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  }, [workspaceInfo.id, router]);

  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Delete workspace</h3>
      {modalState.showDeleteConfirmation ? (
        <div className="border rounded-lg p-4 space-y-4">
          <p className="text-sm">
            Are you sure you want to delete "{workspaceName}"? This action
            cannot be undone and all documents within this workspace will be
            permanently deleted.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => toggleModalState('showDeleteConfirmation', false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className="text-red-500 hover:text-red-500 hover:bg-red-100 justify-start px-3 h-auto"
          disabled={!isSuperAdmin}
          onClick={() => toggleModalState('showDeleteConfirmation', true)}
        >
          Delete workspace
        </Button>
      )}
    </div>
  );
}
