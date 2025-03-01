import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceDocuments } from '@/app/actions/getWorkspaceDocuments';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    const documents = await getWorkspaceDocuments(workspaceId);

    return NextResponse.json({ success: true, documents }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/workspaces/documents:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
