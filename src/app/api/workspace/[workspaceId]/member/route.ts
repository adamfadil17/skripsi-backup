import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { getWorkspaceMembers } from '@/app/actions/getWorkspaceMembers';

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

    const members = await getWorkspaceMembers(workspaceId);
    return NextResponse.json({ success: true, members }, { status: 200 });
  } catch (error) {
    console.error('Error in fetching workspace members:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
