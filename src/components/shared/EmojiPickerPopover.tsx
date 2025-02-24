'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import EmojiPicker from 'emoji-picker-react';
import { ReactNode } from 'react';

interface EmojiPickerPopoverProps {
  type: 'dashboard' | 'document';
  children: ReactNode;
  setEmoji: (emoji: string) => void;
}

const EmojiPickerPopover = ({
  type,
  children,
  setEmoji,
}: EmojiPickerPopoverProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-full p-0"
        align={type === 'document' ? 'start' : 'end'}
        side={type === 'document' ? 'right' : 'left'}
        sideOffset={type === 'document' ? 10 : 32}
      >
        <EmojiPicker
          onEmojiClick={(emojiData) => setEmoji(emojiData.emoji)}
          width="100%"
          height={400}
        />
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPickerPopover;
