import { sendInvitation } from '@/app/actions/sendInvitation';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    // Cek apakah user sudah login
    if (!currentUser?.id || !currentUser?.email) {
      return NextResponse.json(
        {
          status: 'error',
          code: 401,
          error_type: 'Unauthorized',
          message: 'Unauthorized access',
        },
        { status: 401 }
      );
    }

    const { email, workspaceId, role } = await req.json();

    // Validasi input
    if (!email || !workspaceId || !role) {
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

    // Kirim undangan
    const invitation = await sendInvitation(
      email,
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
