'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import CoverPickerDialog from '../../../../../components/shared/CoverPickerDialog';
import EmojiPickerPopover from '../../../../../components/shared/EmojiPickerPopover';
import { SmilePlus } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import type { WorkspaceDocument } from '@/types/types';
import axios from 'axios';
import toast from 'react-hot-toast';
import AITemplateDialog from './AITemplateDialog';
import DocumentNoteEditor from './DocumentNoteEditor';
import { usePusherChannelContext } from '../../components/PusherChannelProvider';
interface DocumentContainerProps {
  workspaceId: string;
  documentId: string;
  documentInfo: WorkspaceDocument;
}

const DocumentContainer = ({
  workspaceId,
  documentId,
  documentInfo,
}: DocumentContainerProps) => {
  const [emoji, setEmoji] = useState<string>('');
  const [coverImage, setCoverImage] = useState('/images/placeholder.svg');
  const [documentTitle, setDocumentTitle] = useState('');
  const [modelResponse, setModelResponse] = useState<any>(null);

  const { channel: workspaceChannel } = usePusherChannelContext();

  useEffect(() => {
    setEmoji(documentInfo?.emoji || '');
    setCoverImage(documentInfo?.coverImage || '/images/placeholder.svg');
    setDocumentTitle(documentInfo?.title || '');
  }, [documentInfo]);

  useEffect(() => {
    if (!workspaceChannel) return;

    console.log('Setting up Pusher listeners for document:', documentId);

    // Document update event handler
    const handleDocumentUpdated = (updatedDocument: WorkspaceDocument) => {
      console.log(
        '🔥 EVENT RECEIVED document-updated in DocumentContainer:',
        updatedDocument
      );

      // Only update if it's the current document
      if (updatedDocument.id === documentId) {
        setEmoji(updatedDocument.emoji || '');
        setCoverImage(updatedDocument.coverImage || '/images/placeholder.svg');
        setDocumentTitle(updatedDocument.title || '');
      }
    };

    // Subscribe to document events
    workspaceChannel.bind('document-updated', handleDocumentUpdated);

    // Cleanup
    return () => {
      console.log('Cleaning up Pusher listeners');
      workspaceChannel.unbind('document-updated', handleDocumentUpdated);
    };
  }, [workspaceChannel, documentId]);

  const updateDocument = async (data: Partial<WorkspaceDocument>) => {
    try {
      const response = await axios.patch(
        `/api/workspace/${workspaceId}/document/${documentId}`,
        data
      );

      if (response.data.status === 'success') {
        toast.success('Document updated successfully');
        // No need to call router.refresh() since Pusher will handle the real-time update
      } else {
        toast.error(response.data.message || 'Unknown error occurred');
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'An unexpected error occurred.';
      toast.error(errorMessage);
    }
  };

  const handleCoverChange = (newCover: string) => {
    setCoverImage(newCover);
    updateDocument({ coverImage: newCover });
  };

  const handleEmojiChange = (newEmoji: string) => {
    setEmoji(newEmoji);
    updateDocument({ emoji: newEmoji });
  };

  const handleTitleChange = (newTitle: string) => {
    setDocumentTitle(newTitle);
    updateDocument({ title: newTitle });
  };

  return (
    <>
      <CoverPickerDialog currentCover={coverImage} setCover={handleCoverChange}>
        <div className="relative group cursor-pointer ">
          <h2 className="hidden absolute p-4 w-full h-full group-hover:flex items-center justify-center font-medium">
            Change Cover
          </h2>
          <div className="group-hover:opacity-40">
            <Image
              priority
              src={coverImage || '/images/placeholder.svg'}
              alt="cover"
              width={400}
              height={400}
              className="w-full h-[200px] object-cover rounded-lg"
            />
          </div>
        </div>
      </CoverPickerDialog>

      <div className="absolute ml-12 mt-[-40px] cursor-pointer">
        <EmojiPickerPopover setEmoji={handleEmojiChange} type="document">
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
          className="max-w-[840px] font-bold text-4xl truncate outline-none"
          onChange={(e) => setDocumentTitle(e.target.value)}
          onBlur={(event) => handleTitleChange(event.target.value)}
        />
        <AITemplateDialog onGenerateTemplate={setModelResponse}>
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
      <div className="flex justify-center items-center ml-12">
        <DocumentNoteEditor
          workspaceId={workspaceId}
          documentId={documentId}
          modelResponse={modelResponse}
        />
      </div>
    </>
  );
};

export default DocumentContainer;
