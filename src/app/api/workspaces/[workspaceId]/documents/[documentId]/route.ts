// src/app/api/workspaces/[id]/documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById } from '@/app/actions/getDocumentById';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceId: string; documentId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser?.email) {
      throw new Error('Unauthorized');
    }
    const { workspaceId, documentId } = params;

    if (!workspaceId || !documentId) {
      return NextResponse.json(
        { error: 'workspaceId and documentId are required' },
        { status: 400 }
      );
    }

    const document = await getDocumentById(workspaceId, documentId);

    return NextResponse.json({ success: true, document }, { status: 200 });
  } catch (error: any) {
    console.error('Error in GET /api/workspaces/[id]/documents/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
