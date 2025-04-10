import DocumentWrapper from './components/DocumentWrapper';

interface DocumentPageProps {
  params: {
    workspaceid: string;
    documentid: string;
  };
}

const DocumentPage = ({ params }: DocumentPageProps) => {
  const { workspaceid, documentid } = params;

  return (
    <div className="h-full">
      <DocumentWrapper workspaceId={workspaceid} documentId={documentid} />
    </div>
  );
};

export default DocumentPage;
