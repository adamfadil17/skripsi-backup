import prisma from "@/lib/prismadb";

export async function getDocumentContentById(documentId: string) {
  try {
    if (!documentId) {
      throw {
        error_type: "BadRequest",
        message: "Document ID is required",
      };
    }

    const documentContent = await prisma.documentContent.findFirst({
      where: { documentId },
      orderBy: { editedAt: "desc" },
      select: {
        content: true,
        editedAt: true,
        version: true,
        lastEditedAt: true,
      },
    });

    if (!documentContent) {
      throw {
        error_type: "NotFound",
        message: "Document content not found",
      };
    }

    return documentContent;
  } catch (error) {
    console.error("Error fetching document content:", error);
    throw error;
  }
}
