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

    // Cek apakah email pengguna sesuai dengan email dalam undangan
    if (currentUser.email !== invitation.email) {
      return NextResponse.json(
        { message: 'Forbidden: Email does not match the invitation' },
        { status: 403 }
      );
    }

    // Cek apakah pengguna sudah menjadi anggota workspace
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: invitation.workspaceId,
        userId: currentUser.id,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        {
          error_type: 'UserIsMember',
          message: 'You are already a member of this workspace',
        },
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

    // Hapus undangan setelah diterima
    await prisma.invitation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Invitation accepted' });
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
