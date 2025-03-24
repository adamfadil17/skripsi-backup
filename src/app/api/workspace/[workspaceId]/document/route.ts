import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
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

    const { workspaceId } = params;
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

    const { title, emoji, coverImage } = await req.json();

    if (!title || !emoji || !coverImage) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'All fields are required',
        },
        { status: 400 }
      );
    }

    const newDocument = await prisma.document.create({
      data: {
        title: title || 'Untitled Document',
        emoji: emoji || '📝',
        coverImage: coverImage || '/images/cover.png',
        createdById: currentUser.id,
        workspaceId,

        documentContents: {
          create: {
            content: {
              time: Date.now(),
              blocks: [
                {
                  type: 'paragraph',
                  data: {
                    text: 'Welcome to your new workspace! Start collaborating here.',
                  },
                },
              ],
              version: '2.30.8',
            },
            editedById: currentUser.id,
          },
        },
      },
      include: {
        documentContents: true,
      },
    });

    return NextResponse.json(
      {
        status: 'success',
        code: 201,
        message: 'Document created successfully',
        data: { newDocument },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating document:', error);
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
