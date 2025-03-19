'use client';

import React, { ReactNode, useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../../../components/ui/dialog';
import { Input } from '../../../../../components/ui/input';
import { Button } from '../../../../../components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '../../../../../components/ui/form';
import { chatSession } from '@/lib/GoogleAIModel';
import toast from 'react-hot-toast';

interface AITemplateDialogProps {
  children: ReactNode;
  onGenerateTemplate: (template: any) => void;
}

const formSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Please enter a prompt.')
    .max(100, 'Prompt must be 100 characters or less'),
});

function AITemplateDialog({
  children,
  onGenerateTemplate,
}: AITemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: '',
    },
  });

  const handleCancel = () => {
    setOpen(false);
    form.reset();
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);

      const prompt = `Generate template for editor.js in JSON for ${values.prompt}`;
      const result = await chatSession.sendMessage(prompt);
      const responseText = await result.response.text();
      const output = JSON.parse(responseText);

      onGenerateTemplate(output);
      setOpen(false);
      form.reset();
    } catch (error: any) {
      if (error?.response?.status === 400) {
        form.setError('prompt', {
          message: 'Failed to generate a prompt.',
        });
      }
      toast.error('Failed to create workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        className="sm:max-w-[600px]"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Image
              src={'/images/gemini-icon.svg'}
              alt="Gemini"
              width={24}
              height={24}
            />
            <DialogTitle>AI Template Generate</DialogTitle>
          </div>
        </DialogHeader>
        <div>
          <DialogDescription className="pb-3">
            What do you want to write in this document?
          </DialogDescription>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Retail Stock Market Analysis"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <div className="flex w-full justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate'
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AITemplateDialog;
