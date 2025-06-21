// app/api/workspace/[workspaceId]/document/[documentId]/content/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions/getCurrentUser";
import { getDocumentContentById } from "@/app/actions/getDocumentContentById";
import { updateDocumentContentById } from "@/app/actions/updateDocumentContentById";

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceId: string; documentId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser?.email) {
      return NextResponse.json(
        {
          status: "error",
          code: 401,
          error_type: "Unauthorized",
          message: "Unauthorized access",
        },
        { status: 401 }
      );
    }

    const { workspaceId, documentId } = params;
    if (!workspaceId || !documentId) {
      return NextResponse.json(
        {
          status: "error",
          code: 400,
          error_type: "BadRequest",
          message: "workspaceId and documentId are required",
        },
        { status: 400 }
      );
    }

    // Get document content with proper error handling
    const documentContent = await getDocumentContentById(
      documentId,
      currentUser,
      workspaceId
    );

    if (!documentContent) {
      return NextResponse.json(
        {
          status: "success",
          code: 200,
          message: "Document content retrieved successfully",
          data: {
            content: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [],
                },
              ],
            },
            editedAt: new Date(),
            editedBy: {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
            },
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        status: "success",
        code: 200,
        message: "Document content retrieved successfully",
        data: {
          content: documentContent.content,
          editedAt: documentContent.editedAt,
          editedBy: documentContent.editedBy,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching document content:", error);

    // Handle specific error types
    if (error.error_type === "NotFound") {
      return NextResponse.json(
        {
          status: "error",
          code: 404,
          error_type: "NotFound",
          message: error.message || "Document content not found",
        },
        { status: 404 }
      );
    }

    if (error.error_type === "Forbidden") {
      return NextResponse.json(
        {
          status: "error",
          code: 403,
          error_type: "Forbidden",
          message: error.message || "Access denied to this document",
        },
        { status: 403 }
      );
    }

    if (error.error_type === "BadRequest") {
      return NextResponse.json(
        {
          status: "error",
          code: 400,
          error_type: "BadRequest",
          message: error.message || "Invalid request parameters",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        status: "error",
        code: 500,
        error_type: "InternalServerError",
        message: "An unexpected error occurred. Please try again later.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { workspaceId: string; documentId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser?.email) {
      return NextResponse.json(
        {
          status: "error",
          code: 401,
          error_type: "Unauthorized",
          message: "Unauthorized access",
        },
        { status: 401 }
      );
    }

    const { workspaceId, documentId } = params;
    if (!workspaceId || !documentId) {
      return NextResponse.json(
        {
          status: "error",
          code: 400,
          error_type: "BadRequest",
          message: "workspaceId and documentId are required",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    if (!body?.content) {
      return NextResponse.json(
        {
          status: "error",
          code: 400,
          error_type: "BadRequest",
          message: "Content is required",
        },
        { status: 400 }
      );
    }

    // Validate TipTap content structure
    if (typeof body.content !== "object" || body.content.type !== "doc") {
      return NextResponse.json(
        {
          status: "error",
          code: 400,
          error_type: "BadRequest",
          message: "Invalid TipTap content structure",
        },
        { status: 400 }
      );
    }

    const result = await updateDocumentContentById(
      workspaceId,
      documentId,
      body.content,
      body.userEmail || currentUser.email,
      currentUser
    );

    return NextResponse.json(
      {
        status: "success",
        code: 200,
        message: "Document content updated successfully",
        data: {
          updatedContent: result.updatedContent,
          content: result.content,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating document content:", error);

    // Handle specific error types
    if (error.error_type === "BadRequest") {
      return NextResponse.json(
        {
          status: "error",
          code: 400,
          error_type: "BadRequest",
          message: error.message || "Invalid request parameters",
        },
        { status: 400 }
      );
    }

    if (error.error_type === "NotFound") {
      return NextResponse.json(
        {
          status: "error",
          code: 404,
          error_type: "NotFound",
          message: error.message || "Document or user not found",
        },
        { status: 404 }
      );
    }

    if (error.error_type === "Forbidden") {
      return NextResponse.json(
        {
          status: "error",
          code: 403,
          error_type: "Forbidden",
          message:
            error.message ||
            "You do not have permission to update this document",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        status: "error",
        code: 500,
        error_type: "InternalServerError",
        message: "An unexpected error occurred. Please try again later.",
      },
      { status: 500 }
    );
  }
}
