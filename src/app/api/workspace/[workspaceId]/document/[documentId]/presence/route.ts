import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { pusherServer } from "@/lib/pusher";
import { authOptions } from "@/lib/auth-options";

export async function POST(
  request: NextRequest,
  { params }: { params: { workspaceId: string; documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { userEmail, timestamp } = await request.json();

    // Broadcast user presence to all connected clients
    await pusherServer.trigger(
      `document-${params.documentId}`,
      "user-presence",
      {
        userEmail,
        timestamp,
      }
    );

    return NextResponse.json({
      status: "success",
      message: "Presence broadcasted successfully",
    });
  } catch (error) {
    console.error("Error broadcasting presence:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to broadcast presence" },
      { status: 500 }
    );
  }
}
