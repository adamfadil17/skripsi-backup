import { sendInvitation } from '@/app/actions/sendInvitation';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import prisma from '@/lib/prismadb';

export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
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

    const { email, role } = await req.json();
    const { workspaceId } = params; // Menggunakan destructuring di sini

    if (!workspaceId) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Workspace ID is required',
        },
        { status: 400 }
      );
    }

    // Validasi input
    if (!email || !role) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Missing required fields: email, workspaceId, or role.',
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Cek apakah email sudah menjadi member workspace
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: {
          email: normalizedEmail,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'AlreadyMember',
          message: 'This user is already a member of the workspace.',
        },
        { status: 400 }
      );
    }

    // Cek apakah email sudah menerima invitation sebelumnya
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        workspaceId,
        email: normalizedEmail,
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'AlreadyInvited',
          message: 'This user has already been invited to the workspace.',
        },
        { status: 400 }
      );
    }

    // Kirim undangan
    const invitation = await sendInvitation(
      normalizedEmail,
      workspaceId,
      currentUser.id,
      role
    );

    return NextResponse.json(
      {
        status: 'success',
        code: 201,
        message: 'Invitation sent successfully.',
        data: invitation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error sending invitation:', error);
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
