'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import CoverPickerDialog from '../../../../../components/shared/CoverPickerDialog';
import EmojiPickerPopover from '../../../../../components/shared/EmojiPickerPopover';
import { SmilePlus } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import AITemplateDialog from './AITemplateDialog';

const DocumentHeader = () => {
  const [emoji, setEmoji] = useState<string>();
  const [coverImage, setCoverImage] = useState('/images/cover.png');
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');

  return (
    <>
      <CoverPickerDialog currentCover={coverImage} setCover={setCoverImage}>
        <div className="relative group cursor-pointer ">
          <h2 className="hidden absolute p-4 w-full h-full group-hover:flex items-center justify-center font-medium">
            Change Cover
          </h2>
          <div className="group-hover:opacity-40">
            <Image
              priority
              src={coverImage}
              alt="cover"
              width={400}
              height={400}
              className="w-full h-[200px] object-cover rounded-lg"
            />
          </div>
        </div>
      </CoverPickerDialog>

      <div className="absolute ml-12 mt-[-40px] cursor-pointer">
        <EmojiPickerPopover setEmoji={(v) => setEmoji(v)} type="document">
          <div className="w-24 flex items-center justify-center bg-[#ffffffb0] p-4 rounded-md shadow-md">
            {emoji ? (
              <span className="text-5xl">{emoji}</span>
            ) : (
              <SmilePlus className="h-10 w-10 text-gray-500" />
            )}
          </div>
        </EmojiPickerPopover>
      </div>

      <div className="flex justify-between items-center mt-10 ml-12 mr-12 py-4">
        <input
          type="text"
          placeholder="Untitled Document"
          defaultValue={documentTitle}
          className="font-bold text-4xl outline-none"
          onBlur={(event) => setDocumentTitle(event.target.value)}
        />
        <AITemplateDialog>
          <Button
            variant={'outline'}
            className="text-gray-700 hover:bg-gray-50 border-gray-300 rounded-lg"
          >
            <Image
              src={'/images/gemini-icon.svg'}
              alt="Gemini"
              width={24}
              height={24}
            />
            AI Template Generate
          </Button>
        </AITemplateDialog>
      </div>
    </>
  );
};

export default DocumentHeader;
