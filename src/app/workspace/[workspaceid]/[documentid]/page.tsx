import DocumentHeader from './components/DocumentHeader';
import DocumentNoteEditor from './components/DocumentNoteEditor';
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
