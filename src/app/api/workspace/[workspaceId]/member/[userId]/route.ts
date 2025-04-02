import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

export async function PUT(
  req: NextRequest,
  { params }: { params: { workspaceId: string; userId: string } }
) {
  try {
    const { userId, newRole } = await req.json();
    const currentUser = await getCurrentUser();

    if (!currentUser.id || !currentUser?.email) {
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
    const isMember = workspaceUser.role === 'MEMBER';

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
    if (isSuperAdmin) {
      // Jika targetUser adalah Super Admin dan peran baru bukan Super Admin
      if (targetUser.role === 'SUPER_ADMIN' && newRole !== 'SUPER_ADMIN') {
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

      // Update role Super Admin ke role lain yang diizinkan
      if (newRole !== 'SUPER_ADMIN') {
        await prisma.workspaceMember.update({
          where: {
            userId_workspaceId: { userId, workspaceId },
          },
          data: { role: newRole },
        });
        return NextResponse.json({ message: 'Role updated successfully' });
      }
    }

    // Admin hanya boleh mempromosikan Member menjadi Admin
    if (isAdmin && targetUser.role === 'MEMBER' && newRole === 'ADMIN') {
      await prisma.workspaceMember.update({
        where: {
          userId_workspaceId: { userId, workspaceId },
        },
        data: { role: newRole },
      });
      return NextResponse.json({ message: 'Role updated successfully' });
    }

    // Admin tidak bisa menurunkan Admin menjadi Member
    if (isAdmin && targetUser.role === 'ADMIN' && newRole === 'MEMBER') {
      return NextResponse.json(
        { message: 'Admin cannot demote another Admin to Member' },
        { status: 403 }
      );
    }

    // Member tidak bisa mengubah role siapa pun
    if (isMember) {
      return NextResponse.json(
        { message: 'Members cannot change roles' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { message: 'No valid role changes allowed' },
      { status: 403 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { workspaceId: string; userId: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    // Cek apakah user sudah login
    if (!currentUser?.id || !currentUser?.email) {
      return NextResponse.json(
        {
          status: 'error',
          code: 401,
          error_type: 'Unauthorized',
          message: 'Unauthorized access. Please log in.',
        },
        { status: 401 }
      );
    }

    const { workspaceId, userId } = params;

    if (!workspaceId || !userId) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Workspace ID and User ID are required',
        },
        { status: 400 }
      );
    }

    // Cek role dari current user
    const currentUserRole = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: currentUser.id },
    });

    // Cek role user yang akan dihapus
    const targetUserRole = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });

    // Admin tidak bisa menghapus Super Admin atau Admin
    if (
      currentUserRole?.role === 'ADMIN' &&
      (targetUserRole?.role === 'SUPER_ADMIN' ||
        targetUserRole?.role === 'ADMIN')
    ) {
      return NextResponse.json(
        {
          status: 'error',
          code: 403,
          error_type: 'Forbidden',
          message: 'Admin cannot remove Super Admin or Admin',
        },
        { status: 403 }
      );
    }

    // Admin hanya bisa menghapus member
    if (
      currentUserRole?.role === 'ADMIN' &&
      targetUserRole?.role === 'MEMBER'
    ) {
      // Lakukan penghapusan member
      await prisma.workspaceMember.delete({
        where: { userId_workspaceId: { userId, workspaceId } },
      });

      return NextResponse.json(
        {
          status: 'success',
          code: 200,
          message: 'Member removed successfully.',
        },
        { status: 200 }
      );
    }

    // Super Admin bisa menghapus siapa saja
    if (currentUserRole?.role === 'SUPER_ADMIN') {
      // Lakukan penghapusan member
      await prisma.workspaceMember.delete({
        where: { userId_workspaceId: { userId, workspaceId } },
      });

      return NextResponse.json(
        {
          status: 'success',
          code: 200,
          message: 'Member removed successfully.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        status: 'error',
        code: 403,
        error_type: 'Forbidden',
        message: 'You do not have permission to remove this user.',
      },
      { status: 403 }
    );
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      {
        status: 'error',
        code: 500,
        error_type: 'InternalServerError',
        message: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}
