import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
    });

    if (!invitation) {
      return NextResponse.json(
        { message: 'Invitation not found' },
        { status: 404 }
      );
    }

    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json(
        { message: 'Invitation expired' },
        { status: 400 }
      );
    }

    if (new Date() > invitation.expiredAt) {
      return NextResponse.json(
        { message: 'Invitation expired' },
        { status: 400 }
      );
    }

    // Tambahkan pengguna ke workspace
    await prisma.workspaceMember.create({
      data: {
        workspaceId: invitation.workspaceId,
        userId: currentUser.id, // Sekarang kita gunakan ID user dari sesi
        role: invitation.role,
      },
    });

    // Update status undangan
    await prisma.invitation.update({
      where: { id: params.id },
      data: { status: 'ACCEPTED' },
    });

    return NextResponse.json({ message: 'Invitation accepted' });
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
