import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { room } = await request.json();

    // Verify user has access to the document (room)
    const document = await prisma.document.findUnique({
      where: { id: room },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId: currentUser.id },
            },
          },
        },
      },
    });

    if (!document || document.workspace.members.length === 0) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    // Return user info for Liveblocks
    return NextResponse.json({
      userId: currentUser.id,
      userInfo: {
        name: currentUser.name,
        email: currentUser.email,
        image: currentUser.image,
      },
    });
  } catch (error) {
    console.error("Liveblocks auth error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
