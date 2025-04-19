import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { getUserWorkspaces } from '@/app/actions/getUserWorkspaces';

export async function GET(req: NextRequest) {
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

    const workspaces = await getUserWorkspaces(currentUser);

    if (!workspaces) {
      return NextResponse.json(
        {
          status: 'error',
          code: 404,
          error_type: 'NotFound',
          message: 'Workspaces not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        status: 'success',
        code: 200,
        message: 'Workspaces fetched successfully',
        data: { workspaces },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching workspaces:', error);
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

export async function POST(req: NextRequest) {
  try {
    // Ambil data pengguna saat ini
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

    // Ambil input dari request
    const { name, emoji, coverImage } = await req.json();

    if (!name) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Workspace name is required',
        },
        { status: 400 }
      );
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
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Workspace name already exists',
        },
        { status: 400 }
      );
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
        conversation: {
          create: {
            messages: {
              create: {
                body: `Welcome to the ${name} workspace! Start collaborating here.`,
                senderId: currentUser.id,
                seenIds: [currentUser.id]
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
        conversation: {
          include: {
            messages: true
          }
        },
        documents: true,
      },
    });

    return NextResponse.json(
      {
        status: 'success',
        code: 201,
        message: 'Workspace created successfully',
        data: { newWorkspace },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating workspace:', error);
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
