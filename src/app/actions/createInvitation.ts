import prisma from "@/lib/prismadb";
import { User } from "@prisma/client";
import { pusherServer } from "@/lib/pusher";
import { sendInvitation } from "@/app/actions/sendInvitation";

interface CreateInvitationParams {
  email: string;
  workspaceId: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MEMBER";
  currentUser: User;
}

export async function createInvitation({
  email,
  workspaceId,
  role,
  currentUser,
}: CreateInvitationParams) {
  try {
    if (!currentUser?.id || !currentUser?.email) {
      throw {
        error_type: "Unauthorized",
        message: "Unauthorized access. Please log in.",
      };
    }

    if (!workspaceId) {
      throw {
        error_type: "BadRequest",
        message: "Workspace ID is required",
      };
    }

    if (!email || !role) {
      throw {
        error_type: "BadRequest",
        message: "Missing required fields: email or role.",
      };
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: {
          email: normalizedEmail,
        },
      },
    });

    if (existingMember) {
      throw {
        error_type: "AlreadyMember",
        message: "This user is already a member of the workspace.",
      };
    }

    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        workspaceId,
        email: normalizedEmail,
      },
    });

    if (existingInvitation) {
      throw {
        error_type: "AlreadyInvited",
        message: "This user has already been invited to the workspace.",
      };
    }

    const workspaceUser = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: currentUser.id, workspaceId },
      },
    });

    if (!workspaceUser) {
      throw {
        error_type: "Forbidden",
        message: "You are not a member of this workspace.",
      };
    }

    if (workspaceUser.role !== "SUPER_ADMIN") {
      if (role === "SUPER_ADMIN") {
        throw {
          error_type: "Forbidden",
          message: "Only Super Admin can invite users with role SUPER_ADMIN.",
        };
      }

      if (workspaceUser.role === "ADMIN" && role !== "MEMBER") {
        throw {
          error_type: "Forbidden",
          message: "Admin can only invite users with role MEMBER.",
        };
      }

      if (workspaceUser.role === "MEMBER") {
        throw {
          error_type: "Forbidden",
          message: "Members cannot invite users.",
        };
      }
    }

    const invitation = await sendInvitation(
      normalizedEmail,
      workspaceId,
      currentUser.id,
      role
    );

    await prisma.notification.create({
      data: {
        workspaceId,
        userId: currentUser.id,
        type: "INVITATION_CREATE",
        message: `${currentUser.name} invited ${normalizedEmail} to join this workspace.`,
      },
    });

    await pusherServer.trigger(
      `workspace-${workspaceId}`,
      "invitation-added",
      invitation
    );

    await pusherServer.trigger(
      `notification-${workspaceId}`,
      "invitation-added",
      {
        id: invitation.id,
        email: invitation.email,
        invitedBy: {
          id: currentUser.id,
          name: currentUser.name,
          image: currentUser.image,
        },
      }
    );

    return invitation;
  } catch (error) {
    console.error("Error creating invitation:", error);
    throw error;
  }
}
