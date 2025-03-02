import React from 'react';
import { notFound } from 'next/navigation';
import DocumentHeader from './components/DocumentHeader';
import DocumentNoteEditor from './components/DocumentNoteEditor';

interface DocumentPageProps {
  params: {
    workspaceId: string;
    documentId: string;
  };
}

const DocumentPage = async ({ params }: DocumentPageProps) => {
  const { workspaceId, documentId } = params;

  // if (!workspaceId || !documentId) {
  //   return notFound(); // Validasi URL params
  // }

  // const document = await getDocumentByWorkspaceId(workspaceId, documentId);

  // if (!document) {
  //   return notFound(); // Redirect ke halaman 404 jika tidak valid
  // }

  return (
    <div className="h-full">
      <DocumentHeader />
      <div className="flex justify-start my-4 ml-14 mr-12">
        <DocumentNoteEditor />
      </div>
    </div>
  );
};

export default DocumentPage;
