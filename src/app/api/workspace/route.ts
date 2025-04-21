import { type NextRequest, NextResponse } from 'next/server';
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
    // Get current user
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

    // Get input from request
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

    // Create new workspace with document, chat, and member
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
                seenIds: [currentUser.id],
                seenBy: {
                  connect: {
                    id: currentUser.id,
                  },
                },
              },
            },
          },
        },
        documents: {
          create: {
            // Default document with title 'Untitled Document'
            title: 'Untitled Document',
            emoji: '📝',
            coverImage: '/images/cover.png',
            // Mark who created the document
            createdById: currentUser.id,
            // Since it's a new document, updatedBy can be null
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
                // Use currentUser as initial editor
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
            messages: {
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },
                seenBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
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
