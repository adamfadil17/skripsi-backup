'use client';

import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useWorkspaceSettings } from './WorkspaceSettingsProvider';

export function EmojiPickerPanel() {
  const { setShowEmojiPicker, editWorkspaceForm } = useWorkspaceSettings();

  return (
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
  );
}
