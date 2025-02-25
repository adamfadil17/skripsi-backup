import prisma from "@/lib/prismadb";

export const getDocumentByWorkspaceId = async (workspaceId: string, documentId: string) => {
  try {
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        workspaceId: workspaceId, // Validasi agar documentId sesuai workspaceId
      },
      include: {
        updatedBy: true,
        workspace: true,
      },
    });

    return document;
  } catch (error) {
    console.error("Error fetching document:", error);
    return null;
  }
};
