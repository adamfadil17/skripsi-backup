import { DocumentHeader } from '@/components/shared/DocumentHeader';
import { DocumentNoteEditor } from '@/components/shared/DocumentNoteEditor';
import React from 'react';

const DocumentPage = () => {
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
