import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { getUserWorkspaces } from '@/app/actions/getUserWorkspaces';
import { createWorkspace } from '@/app/actions/createWorkspace';

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

    const body = await req.json();
    const { name, emoji, coverImage } = body;

    try {
      const newWorkspace = await createWorkspace(
        { name, emoji, coverImage },
        currentUser
      );

      return NextResponse.json(
        {
          status: 'success',
          code: 201,
          message: 'Workspace created successfully',
          data: { newWorkspace },
        },
        { status: 201 }
      );
    } catch (error: any) {
      if (error.error_type === 'BadRequest') {
        return NextResponse.json(
          {
            status: 'error',
            code: 400,
            error_type: 'BadRequest',
            message: error.message || 'Invalid request',
          },
          { status: 400 }
        );
      } else if (error.error_type === 'Unauthorized') {
        return NextResponse.json(
          {
            status: 'error',
            code: 401,
            error_type: 'Unauthorized',
            message: error.message || 'Unauthorized access',
          },
          { status: 401 }
        );
      } else {
        throw error;
      }
    }
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
