import { NextRequest, NextResponse } from 'next/server';
import { getDocumentHeader } from '@/app/actions/getDocumentHeader';

export async function GET(req: NextRequest) {
  try {
    // Ambil documentId dari query parameter
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    // Ambil header dokumen berdasarkan documentId
    const document = await getDocumentHeader(documentId);
    return NextResponse.json({ success: true, document }, { status: 200 });
  } catch (error) {
    console.error('Error fetching document header:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
