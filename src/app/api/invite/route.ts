import { sendInvitation } from '@/app/actions/sendInvitation';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { email, workspaceId, role } = await req.json();

    if (!email || !workspaceId || !role) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Gunakan user.id dari sesi sebagai invitedById
    const invitation = await sendInvitation(
      email,
      workspaceId,
      currentUser.id,
      role
    );

    return NextResponse.json({ message: 'Invitation sent', invitation });
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
