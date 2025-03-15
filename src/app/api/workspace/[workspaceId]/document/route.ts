import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';

// export async function GET(
//   request: NextRequest,
//   { params }: { params: { workspaceId: string } }
// ) {
//   try {
//     const workspaceId = params.workspaceId;

//     if (!workspaceId) {
//       return NextResponse.json(
//         { error: 'Workspace ID is required' },
//         { status: 400 }
//       );
//     }

//     // Add authentication check
//     const user = await getCurrentUser();
//     if (!user?.id || !user?.email) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const documents = await getWorkspaceDocuments(workspaceId);
//     return NextResponse.json(documents);
//   } catch (error) {
//     console.error('Error in GET /api/workspace/[workspaceId]/document:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch documents' },
//       { status: 500 }
//     );
//   }
// }

// export async function POST(
//   request: NextRequest,
//   { params }: { params: { workspaceId: string } }
// ) {
//   try {
//     const workspaceId = params.workspaceId;

//     if (!workspaceId) {
//       return NextResponse.json(
//         { error: 'Workspace ID is required' },
//         { status: 400 }
//       );
//     }

//     const user = await getCurrentUser();
//     if (!user?.id || !user?.email) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     // Check if user has access to the workspace
//     const workspace = await prisma.workspace.findFirst({
//       where: {
//         id: workspaceId,
//         members: { some: { userId: user.id } },
//       },
//     });

//     if (!workspace) {
//       return NextResponse.json(
//         { error: 'Workspace not found or access denied' },
//         { status: 404 }
//       );
//     }

//     const { title, emoji, coverImage } = await request.json();

//     const newDocument = await prisma.document.create({
//       data: {
//         title,
//         emoji,
//         coverImage,
//         workspaceId,
//         createdById: user.id,
//       },
//     });

//     return NextResponse.json(newDocument);
//   } catch (error) {
//     console.error(
//       'Error in POST /api/workspace/[workspaceId]/document:',
//       error
//     );
//     return NextResponse.json(
//       { error: 'Failed to create document' },
//       { status: 500 }
//     );
//   }
// }

export async function POST(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { workspaceId } = params;
    const { title, emoji, coverImage } = await request.json();

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
              version: '2.29.1',
            },
            editedById: currentUser.id,
          },
        },
      },
      include: {
        documentContents: true,
      },
    });

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
