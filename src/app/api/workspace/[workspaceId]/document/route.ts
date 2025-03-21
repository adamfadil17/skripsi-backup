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
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = params;
    const { title, emoji, coverImage } = await req.json();

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
      { success: true, message: 'Document created successfully', newDocument },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
