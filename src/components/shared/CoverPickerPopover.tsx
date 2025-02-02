'use client';
import React, { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import coverOptions from '@/lib/coveroptions';
import { ReactNode } from 'react';
import Image from 'next/image';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface Cover {
  imageUrl: string;
}
interface CoverPickerPopoverProps {
  currentCover: string;
  children: ReactNode;
  setCover: (coverUrl: string) => void;
}

export const CoverPickerPopover = ({
  currentCover,
  setCover,
  children,
}: CoverPickerPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCover, setSelectedCover] = useState<Cover>({
    imageUrl: currentCover,
  });

  useEffect(() => {
    setSelectedCover({ imageUrl: currentCover });
  }, [currentCover]);

  const handleUpdate = () => {
    setCover(selectedCover.imageUrl);
    setIsOpen(false);
  };
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-[400px] p-4"
        align="start"
        side="right"
        alignOffset={-24}
        sideOffset={32}
      >
        <div className="space-y-4">
          <h4 className="font-medium leading-none">Update Cover</h4>
          <div className="grid grid-cols-3 gap-2">
            {[{ imageUrl: currentCover }, ...coverOptions].map(
              (cover, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedCover(cover)}
                  className={cn(
                    'aspect-video rounded-lg border-2 bg-cover bg-center transition-all hover:opacity-90',
                    selectedCover.imageUrl === cover.imageUrl &&
                      'border-primary',
                    selectedCover.imageUrl !== cover.imageUrl &&
                      'border-transparent'
                  )}
                >
                  <Image
                    src={cover.imageUrl || '/placeholder.svg'}
                    alt={`Cover ${index}`}
                    width={150}
                    height={100}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </button>
              )
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Update</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
