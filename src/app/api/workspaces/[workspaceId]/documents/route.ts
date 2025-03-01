import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { getWorkspaceDocuments } from '@/app/actions/getWorkspaceDocuments';

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    // Validasi autentikasi pengguna
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { workspaceId } = params; // Ambil workspaceId dari dynamic route
    if (!workspaceId) {
      return new NextResponse('workspaceId is required', { status: 400 });
    }

    // Ambil dokumen dari workspace yang diakses
    const documents = await getWorkspaceDocuments(workspaceId);

    return NextResponse.json({ success: true, documents }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/workspaces/[id]/documents:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
