import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/getCurrentUser';
import { updateWorkspaceById } from '@/app/actions/updateWorkspaceById';
import { deleteWorkspaceById } from '@/app/actions/deleteWorkspaceById';
import { getWorkspaceById } from '@/app/actions/getWorkspaceById';

export async function GET(
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

    // Use the existing getWorkspaceInfo action
    const workspace = await getWorkspaceById(workspaceId, currentUser);

    if (!workspace) {
      return NextResponse.json(
        {
          status: 'error',
          code: 404,
          error_type: 'NotFound',
          message: 'Workspace not found or access denied',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { status: 'success', code: 200, data: { workspace } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching workspace:', error);
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

export async function PUT(
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

    // Get data from body
    const { name, emoji, coverImage } = await req.json();

    try {
      const updatedWorkspace = await updateWorkspaceById(
        workspaceId,
        { name, emoji, coverImage },
        currentUser
      );

      return NextResponse.json(
        {
          status: 'success',
          code: 200,
          message: 'Workspace updated successfully',
          data: { updatedWorkspace },
        },
        { status: 200 }
      );
    } catch (error: any) {
      // Handle specific errors
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
      } else if (error.error_type === 'Forbidden') {
        return NextResponse.json(
          {
            status: 'error',
            code: 403,
            error_type: 'Forbidden',
            message: error.message || 'Forbidden',
          },
          { status: 403 }
        );
      } else if (error.error_type === 'NotFound') {
        return NextResponse.json(
          {
            status: 'error',
            code: 404,
            error_type: 'NotFound',
            message: error.message || 'Not found',
          },
          { status: 404 }
        );
      } else {
        throw error; // Re-throw for the outer catch block
      }
    }
  } catch (error) {
    console.error('Error updating workspace:', error);
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
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

    try {
      const deletedWorkspace = await deleteWorkspaceById(
        workspaceId,
        currentUser
      );

      return NextResponse.json(
        {
          status: 'success',
          code: 200,
          message: 'Workspace deleted successfully',
          data: { deletedWorkspace },
        },
        { status: 200 }
      );
    } catch (error: any) {
      // Handle specific errors
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
      } else if (error.error_type === 'Forbidden') {
        return NextResponse.json(
          {
            status: 'error',
            code: 403,
            error_type: 'Forbidden',
            message: error.message || 'Forbidden',
          },
          { status: 403 }
        );
      } else if (error.error_type === 'NotFound') {
        return NextResponse.json(
          {
            status: 'error',
            code: 404,
            error_type: 'NotFound',
            message: error.message || 'Not found',
          },
          { status: 404 }
        );
      } else {
        throw error; // Re-throw for the outer catch block
      }
    }
  } catch (error) {
    console.error('Error deleting workspace:', error);
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
