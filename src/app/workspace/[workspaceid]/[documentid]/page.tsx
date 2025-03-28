import React from 'react';
import { notFound } from 'next/navigation';
import DocumentContainer from './components/DocumentContainer';
import DocumentNoteEditor from './components/DocumentNoteEditor';
import { getDocumentInfo } from '@/app/actions/getDocumentInfo';

interface DocumentPageProps {
  params: {
    workspaceid: string;
    documentid: string;
  };
}

const DocumentPage = async ({ params }: DocumentPageProps) => {
  const { workspaceid, documentid } = params;

  const documentInfo = await getDocumentInfo(
    params?.workspaceid,
    params?.documentid
  );

  if (!documentInfo) {
    notFound();
  }

  return (
    <div className="h-full">
      <DocumentContainer
        workspaceId={workspaceid}
        documentId={documentid}
        documentInfo={documentInfo}
      />
      {/* <div className="flex justify-start my-4 ml-14 mr-12">
        <DocumentNoteEditor workspaceId={workspaceid} documentId={documentid} />
      </div> */}
    </div>
  );
};

export default DocumentPage;
