'use client';

import * as React from 'react';
import Image from 'next/image';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import coverOptions from '@/lib/coveroptions';

interface CreateWorkspaceProps {
  children: React.ReactNode;
}

export function CreateWorkspace({ children }: CreateWorkspaceProps) {
  //   const [showCoverOptions, setShowCoverOptions] = React.useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [selectedCover, setSelectedCover] = React.useState(
    coverOptions[0].imageUrl
  );
  const [workspaceName, setWorkspaceName] = React.useState('');
  const [selectedEmoji, setSelectedEmoji] = React.useState('💼');
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    console.log({ workspaceName, selectedEmoji, selectedCover });
  };

  const handleEmojiSelect = (emoji: any) => {
    setSelectedEmoji(emoji.native);
    setShowEmojiPicker(false);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={cn('p-0', showEmojiPicker ? 'max-w-fit' : 'max-w-[525px]')}
      >
        <div className="flex h-full">
          <div
            className={cn('p-6', showEmojiPicker ? 'max-w-[525px]' : 'flex-1')}
          >
            <form onSubmit={handleCreate} className="space-y-2 mt-6">
              <div className="space-y-2">
                <div className="relative h-[200px] rounded-lg bg-muted">
                  <Image
                    src={selectedCover || '/placeholder.svg'}
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
                        className="flex items-center gap-2 absolute inset-0 overflow-hidden"
                      >
                        {coverOptions.map((cover, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setSelectedCover(cover.imageUrl)}
                            className={cn(
                              'relative w-[140px] h-[84px] rounded-lg overflow-hidden flex-shrink-0 transition-all',
                              selectedCover === cover.imageUrl &&
                                'ring-2 ring-primary ring-offset-2'
                            )}
                          >
                            <Image
                              src={cover.imageUrl || '/placeholder.svg'}
                              alt={`Cover option ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </button>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 hover:bg-background/90 backdrop-blur-sm z-50"
                        onClick={() => scroll('left')}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
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

              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold mb-1">
                    Create Workspace
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    This is a shared space where you can collaborate with your
                    team. You can always rename it later.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="w-10 h-10"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    {selectedEmoji}
                  </Button>
                  <Input
                    placeholder="IT Data Analyst"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <DialogFooter className="flex gap-2 sm:gap-0">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={!workspaceName.trim()}>
                  Create
                </Button>
              </DialogFooter>
            </form>
          </div>

          {showEmojiPicker && (
            <div className="w-[350px] border-l">
              <div className="p-6">
                <Picker
                  data={data}
                  onEmojiSelect={handleEmojiSelect}
                  theme="light"
                  navPosition="none"
                  previewPosition="none"
                  skinTonePosition="none"
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
}
