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
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Sparkles } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '../ui/form';

interface AITemplateDialogProps {
  children: ReactNode;
}

const formSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Please enter a prompt.')
    .max(100, 'Prompt must be 100 characters or less'),
});

export function AITemplateDialog({ children }: AITemplateDialogProps) {
  const [open, setOpen] = useState(false);
  // const [input, setInput] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: '',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log('Generating template for:', values.prompt);
    setOpen(false);
  };

  // const handleGenerate = () => {
  //   // Handle generate action here
  //   console.log('Generating template for:', input);
  //   setOpen(false);
  // };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
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
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Sparkles className="mr-1 h-4 w-4" /> Generate
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
