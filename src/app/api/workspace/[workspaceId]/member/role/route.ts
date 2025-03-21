import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

export async function PUT(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId, newRole } = await req.json();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = params.workspaceId; // Ambil dari URL

    // Ambil informasi pengguna yang melakukan perubahan role
    const workspaceUser = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: currentUser.id, workspaceId },
      },
    });

    // Ambil informasi pengguna target yang akan diubah rolenya
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

    // Tidak boleh mengubah peran diri sendiri
    if (userId === currentUser.id) {
      return NextResponse.json(
        { message: 'You cannot change your own role' },
        { status: 403 }
      );
    }

    // Admin tidak boleh mengubah Super Admin
    if (isAdmin && targetUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { message: 'Admin cannot change Super Admin role' },
        { status: 403 }
      );
    }

    // Admin tidak boleh mempromosikan pengguna menjadi Super Admin
    if (isAdmin && newRole === 'SUPER_ADMIN') {
      return NextResponse.json(
        { message: 'Admin cannot promote to Super Admin' },
        { status: 403 }
      );
    }

    // Super Admin hanya bisa turun jabatan jika ada Super Admin lain yang tersisa
    if (
      isSuperAdmin &&
      targetUser.role === 'SUPER_ADMIN' &&
      newRole !== 'SUPER_ADMIN'
    ) {
      const superAdminCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: 'SUPER_ADMIN' },
      });

      if (superAdminCount <= 1) {
        return NextResponse.json(
          { message: 'At least one Super Admin must remain' },
          { status: 403 }
        );
      }
    }

    // Admin hanya bisa menurunkan Admin ke Member jika masih ada Super Admin di workspace
    if (isAdmin && targetUser.role === 'ADMIN' && newRole === 'MEMBER') {
      const superAdminCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: 'SUPER_ADMIN' },
      });

      if (superAdminCount === 0) {
        return NextResponse.json(
          {
            message:
              'An Admin cannot demote another Admin if no Super Admin remains',
          },
          { status: 403 }
        );
      }
    }

    // Perubahan role dilakukan jika semua aturan sudah terpenuhi
    await prisma.workspaceMember.update({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
      data: { role: newRole },
    });

    return NextResponse.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
