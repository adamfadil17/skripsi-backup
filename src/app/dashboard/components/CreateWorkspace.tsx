'use client';

import { useState, useRef, ReactNode, useEffect } from 'react';
import Image from 'next/image';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import coverOptions from '@/lib/cover-options';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { LuSmilePlus } from 'react-icons/lu';

const formSchema = z.object({
  workspaceName: z
    .string()
    .min(1, { message: 'Workspace name is required' })
    .max(50, 'Workspace name must be 50 characters or less'),
  emoji: z.string().optional(),
  coverImage: z.string().default(coverOptions[0].imageUrl),
});

interface CreateWorkspaceProps {
  children: ReactNode;
}

const CreateWorkspace = ({ children }: CreateWorkspaceProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workspaceName: '',
      emoji: '💼',
      coverImage: coverOptions[0].imageUrl,
    },
  });

  useEffect(() => {
    if (open) {
      // Reset form to initial state when dialog opens
      form.reset({
        workspaceName: '',
        emoji: '💼',
        coverImage: coverOptions[0].imageUrl,
      });
    }
  }, [open, form]);

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

  const handleCancel = () => {
    setOpen(false);
    form.reset();
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);

      const response = await axios.post('/api/workspace', {
        name: values.workspaceName,
        emoji: values.emoji,
        coverImage: values.coverImage,
      });

      handleCancel();
      router.refresh(); // Refresh to reflect new workspace
      toast.success('Workspace has been created');
    } catch (error: any) {
      if (error?.response?.status === 400) {
        form.setError('workspaceName', {
          message: 'Workspace name already exists.',
        });
      }
      toast.error(
        error.response?.data?.message || 'Failed to create workspace'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        className={cn(
          'p-0 overflow-hidden',
          showEmojiPicker ? 'max-w-fit' : 'max-w-[525px]'
        )}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex h-full">
              <div
                className={cn(
                  'p-6',
                  showEmojiPicker ? 'max-w-[525px]' : 'flex-1'
                )}
              >
                <FormField
                  control={form.control}
                  name="coverImage"
                  render={({ field }) => (
                    <div className="space-y-2 mt-5">
                      <div className="relative h-[200px] rounded-lg bg-muted">
                        <Image
                          src={field.value || '/images/placeholder.svg'}
                          alt="Cover"
                          fill
                          className="object-cover rounded-lg"
                        />
                      </div>

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
                                  onClick={() => field.onChange(cover.imageUrl)}
                                  className={cn(
                                    'relative w-[140px] h-[84px] rounded-lg overflow-hidden flex-shrink-0 transition-all',
                                    field.value === cover.imageUrl &&
                                      'ring-2 ring-primary ring-offset-2'
                                  )}
                                >
                                  <Image
                                    src={
                                      cover.imageUrl ||
                                      '/images/placeholder.svg'
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
                  )}
                />

                <div className="space-y-4 my-4">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold mb-1">
                      Edit Workspace
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                      This is a shared space where you can collaborate with your
                      team. You can always rename it later.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex items-start gap-2">
                    <FormField
                      control={form.control}
                      name="emoji"
                      render={({ field }) => (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="w-10 h-10"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        >
                          {field.value || <LuSmilePlus className="h-4 w-4" />}
                        </Button>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="workspaceName"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="Workspace name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <DialogFooter className="flex gap-2 pt-2 sm:gap-0">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create'
                    )}
                  </Button>
                </DialogFooter>
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
                        form.setValue('emoji', emoji.native);
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkspace;
