'use client';
import React, { useEffect, useState } from 'react';
import coverOptions from '@/lib/cover-options';
import { ReactNode } from 'react';
import Image from 'next/image';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import {
  DialogTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from '../ui/dialog';

interface Cover {
  imageUrl: string;
}
interface CoverPickerDialogProps {
  currentCover: string;
  children: ReactNode;
  setCover: (coverUrl: string) => void;
}

const CoverPickerDialog = ({
  currentCover,
  setCover,
  children,
}: CoverPickerDialogProps) => {
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        className="w-[600px] p-4"
      >
        <DialogHeader>
          <DialogTitle>Update Cover</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-4 gap-2">
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
                    src={cover.imageUrl || '/images/placeholder.svg'}
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
            <Button onClick={handleUpdate}>Apply</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoverPickerDialog;
