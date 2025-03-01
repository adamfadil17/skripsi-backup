import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceById } from '@/app/actions/getWorkspaceById';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { workspaceId } = params;

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    const workspace = await getWorkspaceById(workspaceId);

    return NextResponse.json({ success: true, workspace }, { status: 200 });
  } catch (error: any) {
    console.error('Error in GET /api/workspaces/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
