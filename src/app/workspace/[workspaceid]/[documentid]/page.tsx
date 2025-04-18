import { getCurrentUser } from '@/app/actions/getCurrentUser';
import prisma from '@/lib/prismadb';
import { notFound } from 'next/navigation';
import DocumentWrapper from './components/DocumentWrapper';

interface DocumentPageProps {
  params: { workspaceid: string; documentid: string };
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const workspaceId = params.workspaceid;
  const documentId = params.documentid;

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return notFound();
  }

  const currentMember = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: currentUser.id,
        workspaceId,
      },
    },
  });

  if (!currentMember) {
    return notFound();
  }

  return <DocumentWrapper workspaceId={workspaceId} documentId={documentId} />;
}
