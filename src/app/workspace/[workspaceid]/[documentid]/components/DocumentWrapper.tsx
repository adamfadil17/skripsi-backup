'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { PusherChannelProvider } from '../../components/PusherChannelProvider';
import DocumentContainer from './DocumentContainer';
import type { WorkspaceDocument } from '@/types/types';

interface DocumentWrapperProps {
  workspaceId: string;
  documentId: string;
}

const DocumentWrapper = ({ workspaceId, documentId }: DocumentWrapperProps) => {
  const [documentInfo, setDocumentInfo] = useState<WorkspaceDocument | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
    <DocumentContainer
      workspaceId={workspaceId}
      documentId={documentId}
      documentInfo={documentInfo}
    />
  );
};

export default DocumentWrapper;
