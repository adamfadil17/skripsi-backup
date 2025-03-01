import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { getWorkspaceDocuments } from '@/app/actions/getWorkspaceDocuments';
import { getWorkspaceMembers } from '@/app/actions/getWorkspaceMembers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const type = searchParams.get('type'); // Bisa 'documents' atau 'members'

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (type === 'documents') {
      const documents = await getWorkspaceDocuments(
        workspaceId,
        currentUser.id
      );
      return NextResponse.json({ success: true, documents }, { status: 200 });
    }

    if (type === 'members') {
      const members = await getWorkspaceMembers(workspaceId);
      return NextResponse.json({ success: true, members }, { status: 200 });
    }

    return NextResponse.json(
      { error: 'Invalid type parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in workspace route:', error);
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
                  version: '2.29.1',
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

    return NextResponse.json(newWorkspace, { status: 201 });
  } catch (error) {
    console.error('Error creating workspace:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Ambil query parameter workspaceid
    const { searchParams } = new URL(req.url);
    const workspaceid = searchParams.get('workspaceid');
    if (!workspaceid) {
      return new NextResponse('Workspace id is required', { status: 400 });
    }

    // Ambil data update dari request body
    const { name, emoji, coverImage } = await req.json();

    // Validasi jika perlu, misalnya cek apakah user memiliki akses
    // Misalnya cek apakah user adalah SUPER_ADMIN di workspace tersebut

    // Update workspace
    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceid },
      data: { name, emoji, coverImage },
    });

    return NextResponse.json(updatedWorkspace, { status: 200 });
  } catch (error) {
    console.error('Error updating workspace:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Ambil user saat ini
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Ambil workspace id dari query parameter
    const { searchParams } = new URL(req.url);
    const workspaceid = searchParams.get('workspaceId');
    if (!workspaceid) {
      return new NextResponse('Workspace id is required', { status: 400 });
    }

    // Temukan workspace berdasarkan id, sertakan member untuk validasi peran
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceid },
      include: { members: true },
    });

    if (!workspace) {
      return new NextResponse('Workspace not found', { status: 404 });
    }

    // Pastikan currentUser adalah SUPER_ADMIN di workspace tersebut
    const isOwner = workspace.members.some(
      (member) =>
        member.userId === currentUser.id && member.role === 'SUPER_ADMIN'
    );
    if (!isOwner) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Hapus workspace. Karena pada model Document sudah disetting onDelete: Cascade,
    // maka dokumen–dokumen di dalam workspace akan ikut terhapus.
    const deletedWorkspace = await prisma.workspace.delete({
      where: { id: workspaceid },
    });

    return NextResponse.json(deletedWorkspace, { status: 200 });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
