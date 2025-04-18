'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import type { WorkspaceDocument } from '@/types/types';
import { usePusherChannelContext } from '../../components/PusherChannelProvider';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { SmilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CoverPickerDialog from '@/components/shared/CoverPickerDialog';
import EmojiPickerPopover from '@/components/shared/EmojiPickerPopover';
import AITemplateDialog from './AITemplateDialog';
import DocumentNoteEditor from './DocumentNoteEditor';

interface DocumentWrapperProps {
  workspaceId: string;
  documentId: string;
}

const DocumentWrapper = ({ workspaceId, documentId }: DocumentWrapperProps) => {
  const router = useRouter();
  const { channel: workspaceChannel } = usePusherChannelContext();

  const [documentInfo, setDocumentInfo] = useState<WorkspaceDocument | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emoji, setEmoji] = useState<string>('');
  const [coverImage, setCoverImage] = useState('/images/placeholder.svg');
  const [documentTitle, setDocumentTitle] = useState('');
  const [modelResponse, setModelResponse] = useState<any>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(
          `/api/workspace/${workspaceId}/document/${documentId}`
        );

        if (
          response.data.status === 'success' &&
          response.data.data?.document
        ) {
          setDocumentInfo(response.data.data.document);
        } else {
          setError(response.data.message || 'Failed to load document');
        }
      } catch (err: any) {
        console.error('Error fetching document:', err);
        setError(
          err.response?.data?.message ||
            'An error occurred while loading the document'
        );

        // If document not found (404), redirect to not found page
        if (err.response?.status === 404) {
          router.push('/not-found');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [workspaceId, documentId, router]);

  useEffect(() => {
    if (documentInfo) {
      setEmoji(documentInfo.emoji || '');
      setCoverImage(documentInfo.coverImage || '/images/placeholder.svg');
      setDocumentTitle(documentInfo.title || '');
    }
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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading document...</div>
      </div>
    );
  }

  if (error || !documentInfo) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-red-500">
          {error || 'Could not load document. Please try again later.'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      {/* Cover Image */}
      <CoverPickerDialog currentCover={coverImage} setCover={handleCoverChange}>
        <div className="relative group m-4 cursor-pointer">
          <h2 className="hidden absolute p-4 w-full h-full group-hover:flex items-center justify-center font-medium">
            Change Cover
          </h2>
          <div className="group-hover:opacity-40">
            <Image
              priority
              src={coverImage || '/placeholder.svg'}
              alt="cover"
              width={800}
              height={200}
              className="w-full h-[200px] object-cover rounded-lg"
            />
          </div>
        </div>
      </CoverPickerDialog>

      {/* Emoji */}
      <div className="absolute left-4 md:left-8 lg:left-12 mt-[160px] cursor-pointer">
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

      {/* Title and AI Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-10 px-4 md:px-8 lg:px-12 py-4 gap-4">
        <input
          type="text"
          placeholder="Untitled Document"
          value={documentTitle}
          className="w-full md:max-w-[840px] font-bold text-4xl truncate outline-none"
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

      {/* Editor Content */}
      <div className="flex justify-center items-center ml-4 px-4 md:px-8 lg:px-12 w-full">
        <DocumentNoteEditor
          workspaceId={workspaceId}
          documentId={documentId}
          modelResponse={modelResponse}
        />
      </div>
    </div>
  );
};

export default DocumentWrapper;
