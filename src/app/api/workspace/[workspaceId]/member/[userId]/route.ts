import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { workspaceId: string; userId: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, userId } = params;

    // Cek apakah pengguna yang melakukan penghapusan ada dalam workspace
    const workspaceUser = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: currentUser.id, workspaceId },
      },
    });

    const targetUser = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
    });

    if (!workspaceUser || !targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const isSuperAdmin = workspaceUser.role === 'SUPER_ADMIN';
    const isAdmin = workspaceUser.role === 'ADMIN';

    if (userId === currentUser.id) {
      return NextResponse.json(
        { message: 'You cannot remove yourself' },
        { status: 403 }
      );
    }

    // Admin hanya bisa menghapus Member
    if (isAdmin && targetUser.role !== 'MEMBER') {
      return NextResponse.json(
        { message: 'Admin can only remove Members' },
        { status: 403 }
      );
    }

    // Admin tidak bisa menghapus Admin lain atau Super Admin
    if (isAdmin && targetUser.role === 'ADMIN') {
      return NextResponse.json(
        { message: 'Admin cannot remove another Admin' },
        { status: 403 }
      );
    }

    if (isAdmin && targetUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { message: 'Admin cannot remove a Super Admin' },
        { status: 403 }
      );
    }

    // Super Admin tidak bisa dihapus jika hanya tersisa satu
    if (targetUser.role === 'SUPER_ADMIN') {
      const superAdminCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: 'SUPER_ADMIN' },
      });

      if (superAdminCount === 1) {
        return NextResponse.json(
          { message: 'Cannot remove the only Super Admin' },
          { status: 403 }
        );
      }
    }

    // Hapus pengguna dari workspace
    await prisma.workspaceMember.delete({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
    });

    return NextResponse.json({ message: 'User removed successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
