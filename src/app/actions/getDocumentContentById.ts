import prisma from "@/lib/prismadb";
import { User } from "@prisma/client";

// Define TipTap content types
interface TipTapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  text?: string;
}

interface TipTapDocument {
  type: "doc";
  content?: TipTapNode[];
}

// Type guard to check if content is a valid TipTap document
function isTipTapDocument(content: any): content is TipTapDocument {
  return (
    content &&
    typeof content === "object" &&
    content.type === "doc" &&
    (content.content === undefined || Array.isArray(content.content))
  );
}

// Function to create default TipTap content
function createDefaultTipTapContent(): TipTapDocument {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
      },
    ],
  };
}

// Function to convert legacy content to TipTap format
function convertToTipTapFormat(content: any): TipTapDocument {
  // If content is already in TipTap format
  if (isTipTapDocument(content)) {
    return content;
  }

  // If content is a string, convert to paragraph
  if (typeof content === "string" && content.trim()) {
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: content,
            },
          ],
        },
      ],
    };
  }

  // If content is Editor.js format (has blocks array)
  if (content && typeof content === "object" && Array.isArray(content.blocks)) {
    const tipTapContent: TipTapNode[] = [];

    content.blocks.forEach((block: any) => {
      switch (block.type) {
        case "paragraph":
          if (block.data?.text) {
            tipTapContent.push({
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: block.data.text,
                },
              ],
            });
          } else {
            tipTapContent.push({ type: "paragraph" });
          }
          break;
        case "header":
          tipTapContent.push({
            type: "heading",
            attrs: {
              level: block.data?.level || 1,
            },
            content: block.data?.text
              ? [
                  {
                    type: "text",
                    text: block.data.text,
                  },
                ]
              : undefined,
          });
          break;
        case "list":
          tipTapContent.push({
            type:
              block.data?.style === "ordered" ? "orderedList" : "bulletList",
            content:
              block.data?.items?.map((item: string) => ({
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: item,
                      },
                    ],
                  },
                ],
              })) || [],
          });
          break;
        default:
          // For unknown block types, convert to paragraph
          if (block.data?.text) {
            tipTapContent.push({
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: block.data.text,
                },
              ],
            });
          }
      }
    });

    return {
      type: "doc",
      content:
        tipTapContent.length > 0 ? tipTapContent : [{ type: "paragraph" }],
    };
  }

  // If content is an array, try to use it as TipTap content
  if (Array.isArray(content)) {
    return {
      type: "doc",
      content: content.length > 0 ? content : [{ type: "paragraph" }],
    };
  }

  // Default fallback
  return createDefaultTipTapContent();
}

export async function getDocumentContentById(
  documentId: string,
  currentUser?: User,
  workspaceId?: string
) {
  try {
    if (!documentId) {
      throw {
        error_type: "BadRequest",
        message: "Document ID is required",
      };
    }

    // If user and workspace are provided, check permissions
    if (currentUser && workspaceId) {
      const membership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: currentUser.id,
        },
      });

      if (!membership) {
        throw {
          error_type: "Forbidden",
          message: "You do not have access to this workspace",
        };
      }

      // Verify document belongs to workspace
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          workspaceId,
        },
      });

      if (!document) {
        throw {
          error_type: "NotFound",
          message: "Document not found in this workspace",
        };
      }
    }

    const documentContent = await prisma.documentContent.findFirst({
      where: { documentId },
      orderBy: { editedAt: "desc" },
      select: {
        content: true,
        editedAt: true,
        editedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!documentContent) {
      // Return default TipTap content structure if no content exists
      return {
        content: createDefaultTipTapContent(),
        editedAt: new Date(),
        editedBy: null,
      };
    }

    // Convert content to TipTap format
    const tipTapContent = convertToTipTapFormat(documentContent.content);

    return {
      content: tipTapContent,
      editedAt: documentContent.editedAt,
      editedBy: documentContent.editedBy,
    };
  } catch (error) {
    console.error("Error fetching document content:", error);
    throw error;
  }
}
