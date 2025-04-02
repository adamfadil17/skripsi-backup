import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import prisma from '@/lib/prismadb'; // Prisma Client

export async function DELETE(
  req: NextRequest,
  { params }: { params: { workspaceId: string; invitationId: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id || !currentUser?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, invitationId } = params;
  if (!workspaceId || !invitationId) {
    return NextResponse.json(
      {
        status: 'error',
        code: 400,
        error_type: 'BadRequest',
        message: 'workspaceId and invitationId are required',
      },
      { status: 400 }
    );
  }

  try {
    // Cek apakah undangan ada
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId, workspaceId: workspaceId },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Hapus undangan dari database
    await prisma.invitation.delete({ where: { id: invitationId } });

    return (
      NextResponse.json({
        status: 'success',
        message: 'Invitation revoked successfully',
      }),
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
