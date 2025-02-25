'use client';

import React, { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LuSmilePlus } from 'react-icons/lu';
import CoverPickerPopover from '@/components/shared/CoverPickerPopover';
import Image from 'next/image';
import EmojiPickerPopover from '@/components/shared/EmojiPickerPopover';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  workspaceName: z
    .string()
    .min(1, { message: 'Workspace name is required' })
    .max(50, 'Workspace name must be 50 characters or less'),
  emoji: z.string().optional(),
  coverImage: z.string().default('/images/cover.png'),
});

interface CreateWorkspaceDialogProps {
  children: ReactNode;
}

const CreateWorkspaceDialog = ({ children }: CreateWorkspaceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workspaceName: '',
      emoji: undefined,
      coverImage: '/images/cover.png',
    },
  });

  const handleCancel = () => {
    setOpen(false);
    form.reset();
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);

      const response = await axios.post('/api/workspaces', {
        name: values.workspaceName,
        emoji: values.emoji,
        coverImage: values.coverImage,
      });

      console.log('Workspace created:', response.data);

      handleCancel();
      router.refresh(); // Refresh to reflect new workspace
      toast('Workspace has been created');
    } catch (error: any) {
      console.error('Error creating workspace:', error);
      if (error?.response?.status === 400) {
        form.setError('workspaceName', {
          message: 'Workspace name already exists.',
        });
      }
      toast.error('Failed to create workspace');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        className="sm:max-w-[600px] p-0 sm:p-6"
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="coverImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Cover Image</FormLabel>
                  <FormControl>
                    <CoverPickerPopover
                      currentCover={field.value}
                      setCover={field.onChange}
                    >
                      <div className="flex items-center justify-center">
                        <div className="w-full sm:max-w-[600px] mt-4 relative group cursor-pointer">
                          <h3 className="hidden absolute p-4 w-full h-full group-hover:flex items-center justify-center font-medium">
                            Change Cover
                          </h3>
                          <div className="group-hover:opacity-40">
                            <Image
                              src={field.value || '/images/cover.png'}
                              alt="cover"
                              width={400}
                              height={400}
                              className="w-full h-[180px] rounded-xl object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    </CoverPickerPopover>
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="p-4 sm:p-0 sm:mt-6">
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl">
                  Create Workspace
                </DialogTitle>
                <DialogDescription className="text-sm sm:text-base">
                  This is a shared space where you can collaborate with your
                  team. You can always rename it later.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-start gap-3">
                  <FormField
                    control={form.control}
                    name="emoji"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">Emoji</FormLabel>
                        <FormControl>
                          <EmojiPickerPopover
                            setEmoji={field.onChange}
                            type="dashboard"
                          >
                            <Button
                              type="button"
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
                  <div className="flex-1">
                    <FormField
                      control={form.control}
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
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkspaceDialog;
