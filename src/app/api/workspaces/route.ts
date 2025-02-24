import { NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

export async function POST(req: Request) {
  try {
    // Ambil data pengguna saat ini
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Ambil input dari request
    const { name, emoji, coverImage = '/images/cover.png' } = await req.json();

    if (!name) {
      return new NextResponse('Workspace name is required', { status: 400 });
    }

    // Cek apakah nama workspace sudah digunakan
    const existingWorkspace = await prisma.workspace.findUnique({
      where: { name },
    });

    if (existingWorkspace) {
      return new NextResponse('Workspace name already exists', { status: 400 });
    }

    // Buat Workspace baru
    const newWorkspace = await prisma.workspace.create({
      data: {
        name,
        emoji,
        coverImage,
        members: {
          create: {
            userId: currentUser.id,
            role: 'SUPER_ADMIN',
          },
        },
        chat: {
          create: {
            messages: {
              create: {
                body: `Welcome to the ${name} workspace! Start collaborating here.`,
                senderId: currentUser.id,
              },
            },
          },
        },
        documents: {
          create: {
            title: 'Welcome Document',
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
              version: '2.29.1',
            },
          },
        },
      },
      include: {
        members: true,
        chat: true,
        documents: true,
      },
    });

    return NextResponse.json(newWorkspace, { status: 201 });
  } catch (error) {
    console.error('Error creating workspace:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
