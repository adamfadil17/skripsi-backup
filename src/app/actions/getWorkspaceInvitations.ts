import prisma from "@/lib/prismadb"
import type { User } from "@prisma/client"
import type { WorkspaceInvitation } from "@/types/types"

export async function getWorkspaceInvitations(workspaceId: string, currentUser: User): Promise<WorkspaceInvitation[]> {
  try {
    if (!currentUser.id || !currentUser.email) {
      throw new Error("User not authenticated")
    }

    const isMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: currentUser.id,
          workspaceId,
        },
      },
    })

    if (!isMember) {
      return [] 
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        workspaceId,
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        invitedAt: "desc",
      },
    })

    return invitations
  } catch (error) {
    console.error("Error fetching workspace invitations:", error)
    return []
  }
}
