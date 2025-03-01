import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceMembers } from '@/app/actions/getWorkspaceMembers';

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
