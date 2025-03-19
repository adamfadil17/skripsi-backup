import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { getUserWorkspaces } from '@/app/actions/getUserWorkspaces';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    // Ambil semua workspaces yang diikuti oleh pengguna
    const workspaces = await getUserWorkspaces();

    return NextResponse.json({ success: true, workspaces }, { status: 200 });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Ambil data pengguna saat ini
    const currentUser = await getCurrentUser();

    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Ambil input dari request
    const { name, emoji, coverImage } = await req.json();

    if (!name) {
      return new NextResponse('Workspace name is required', { status: 400 });
    }

    const existingWorkspace = await prisma.workspace.findFirst({
      where: {
        name,
        members: {
          some: {
            userId: currentUser.id,
          },
        },
      },
    });

    if (existingWorkspace) {
      return new NextResponse('Workspace name already exists', {
        status: 400,
      });
    }

    // Buat Workspace baru beserta dokumen, chat, dan anggota
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
            // Dokumen default dengan judul 'Untitled Document'
            title: 'Untitled Document',
            emoji: '📝',
            coverImage: '/images/cover.png',
            // Menandai siapa yang membuat dokumen
            createdById: currentUser.id,
            // Karena dokumen baru, updatedBy belum ada (boleh null)
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
                // Menggunakan currentUser sebagai editor awal (atau bisa disesuaikan)
                editedById: currentUser.id,
              },
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

    return NextResponse.json({ success: true, newWorkspace }, { status: 201 });
  } catch (error) {
    console.error('Error creating workspace:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
