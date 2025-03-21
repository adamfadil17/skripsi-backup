import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = params;

    // Ambil workspace dengan anggota
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const userMembership = workspace.members.find(
      (m) => m.userId === currentUser.id
    );

    if (!userMembership) {
      return NextResponse.json(
        { error: 'You are not a member of this workspace' },
        { status: 403 }
      );
    }

    // Hitung jumlah Super Admin dalam workspace
    const superAdminCount = workspace.members.filter(
      (m) => m.role === 'SUPER_ADMIN'
    ).length;

    // **(1) Pastikan workspace tidak bisa tanpa Super Admin**
    if (superAdminCount === 0) {
      return NextResponse.json(
        { error: 'A workspace must have at least one Owner.' },
        { status: 400 }
      );
    }

    // **(2) Super Admin terakhir tidak bisa keluar**
    if (superAdminCount === 1 && userMembership.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        {
          error: 'You are the last Owner. Assign another Owner before leaving.',
        },
        { status: 400 }
      );
    }

    // **(3) Hapus pengguna dari workspace jika lolos validasi**
    await prisma.workspaceMember.delete({
      where: {
        userId_workspaceId: {
          userId: currentUser.id,
          workspaceId,
        },
      },
    });

    return NextResponse.json(
      { message: 'Successfully left the workspace' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error leaving workspace:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
