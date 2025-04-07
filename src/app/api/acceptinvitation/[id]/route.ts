import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prismadb"
import { getCurrentUser } from "@/app/actions/getCurrentUser"
import { pusherServer } from "@/lib/pusher"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser?.id || !currentUser?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!invitation) {
      return NextResponse.json({ message: "Invitation not found or expired" }, { status: 404 })
    }

    // Check if email matches the invitation
    if (currentUser.email !== invitation.email) {
      return NextResponse.json({ message: "Forbidden: Email does not match the invitation" }, { status: 403 })
    }

    // Check if user is already a workspace member
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: invitation.workspaceId,
        userId: currentUser.id,
      },
    })

    if (existingMember) {
      return NextResponse.json(
        {
          error_type: "UserIsMember",
          message: "You are already a member of this workspace",
        },
        { status: 400 },
      )
    }

    if (new Date() > invitation.expiredAt) {
      return NextResponse.json({ message: "Invitation expired" }, { status: 400 })
    }

    // Add user to workspace
    const newMember = await prisma.workspaceMember.create({
      data: {
        workspaceId: invitation.workspaceId,
        userId: currentUser.id,
        role: invitation.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    // Delete the invitation
    await prisma.invitation.delete({
      where: { id: params.id },
    })

    // Trigger Pusher events
    // 1. Notify the workspace about the new member
    await pusherServer.trigger(`workspace-${invitation.workspaceId}`, "member-added", newMember)

    // 2. Notify about the removed invitation
    await pusherServer.trigger(`workspace-${invitation.workspaceId}`, "invitation-removed", invitation.id)

    return NextResponse.json({
      message: "Invitation accepted",
      workspaceName: invitation.workspace?.name,
    })
  } catch (error) {
    console.error("Error accepting invitation:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

