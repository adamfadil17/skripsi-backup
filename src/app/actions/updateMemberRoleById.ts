import prisma from "@/lib/prismadb";
import { User } from "@prisma/client";
import { pusherServer } from "@/lib/pusher";

interface UpdateRoleParams {
  userId: string;
  workspaceId: string;
  newRole: "SUPER_ADMIN" | "ADMIN" | "MEMBER";
  currentUser: User;
}

export async function updateMemberRoleById({
  userId,
  workspaceId,
  newRole,
  currentUser,
}: UpdateRoleParams) {
  try {
    if (!currentUser.id || !currentUser.email) {
      throw {
        error_type: "Unauthorized",
        message: "Unauthorized access",
      };
    }

    if (!userId || !workspaceId || !newRole) {
      throw {
        error_type: "BadRequest",
        message: "Missing required fields: userId, workspaceId, or newRole",
      };
    }

    const workspaceUser = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: currentUser.id, workspaceId },
      },
    });

    const targetUser = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId },
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
    });

    if (!workspaceUser || !targetUser) {
      throw {
        error_type: "NotFound",
        message: "User not found in workspace",
      };
    }

    const isSuperAdmin = workspaceUser.role === "SUPER_ADMIN";
    const isAdmin = workspaceUser.role === "ADMIN";
    const isMember = workspaceUser.role === "MEMBER";

    if (userId === currentUser.id) {
      throw {
        error_type: "Forbidden",
        message: "You cannot change your own role",
      };
    }

    if (isAdmin && targetUser.role === "SUPER_ADMIN") {
      throw {
        error_type: "Forbidden",
        message: "Admin cannot change Super Admin role",
      };
    }

    if (isAdmin && newRole === "SUPER_ADMIN") {
      throw {
        error_type: "Forbidden",
        message: "Admin cannot promote to Super Admin",
      };
    }

    if (isSuperAdmin && newRole === "SUPER_ADMIN") {
      const [updatedMember, _notification] = await prisma.$transaction([
        prisma.workspaceMember.update({
          where: {
            userId_workspaceId: { userId, workspaceId },
          },
          data: { role: newRole },
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
        }),
        prisma.notification.create({
          data: {
            workspaceId,
            userId: currentUser.id,
            type: "MEMBER_UPDATE",
            message: `${currentUser.name} promoted ${targetUser.user.name} to Super Admin`,
          },
        }),
      ]);

      await pusherServer.trigger(
        `workspace-${workspaceId}`,
        "member-updated",
        updatedMember
      );

      await pusherServer.trigger(
        `notification-${workspaceId}`,
        "member-updated",
        {
          member: updatedMember.user,
          updatedBy: {
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.image,
          },
        }
      );

      return updatedMember;
    }

    if (
      isSuperAdmin &&
      targetUser.role === "SUPER_ADMIN" &&
      newRole !== "SUPER_ADMIN"
    ) {
      const superAdminCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: "SUPER_ADMIN" },
      });

      if (superAdminCount <= 1) {
        throw {
          error_type: "Forbidden",
          message: "At least one Super Admin must remain",
        };
      }

      const [updatedMember, _notification] = await prisma.$transaction([
        prisma.workspaceMember.update({
          where: {
            userId_workspaceId: { userId, workspaceId },
          },
          data: { role: newRole },
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
        }),
        prisma.notification.create({
          data: {
            workspaceId,
            userId: currentUser.id,
            type: "MEMBER_UPDATE",
            message: `${currentUser.name} changed ${targetUser.user.name} role from Super Admin to ${newRole}`,
          },
        }),
      ]);

      await pusherServer.trigger(
        `workspace-${workspaceId}`,
        "member-updated",
        updatedMember
      );

      await pusherServer.trigger(
        `notification-${workspaceId}`,
        "member-updated",
        {
          member: updatedMember.user,
          updatedBy: {
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.image,
          },
        }
      );

      return updatedMember;
    }

    if (isSuperAdmin && newRole !== "SUPER_ADMIN") {
      const [updatedMember, _notification] = await prisma.$transaction([
        prisma.workspaceMember.update({
          where: {
            userId_workspaceId: { userId, workspaceId },
          },
          data: { role: newRole },
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
        }),
        prisma.notification.create({
          data: {
            workspaceId,
            userId: currentUser.id,
            type: "MEMBER_UPDATE",
            message: `${currentUser.name} changed ${targetUser.user.name} role to ${newRole}`,
          },
        }),
      ]);

      await pusherServer.trigger(
        `workspace-${workspaceId}`,
        "member-updated",
        updatedMember
      );

      await pusherServer.trigger(
        `notification-${workspaceId}`,
        "member-updated",
        {
          member: updatedMember.user,
          updatedBy: {
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.image,
          },
        }
      );

      return updatedMember;
    }

    if (isAdmin && targetUser.role === "MEMBER" && newRole === "ADMIN") {
      const [updatedMember, _notification] = await prisma.$transaction([
        prisma.workspaceMember.update({
          where: {
            userId_workspaceId: { userId, workspaceId },
          },
          data: { role: newRole },
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
        }),
        prisma.notification.create({
          data: {
            workspaceId,
            userId: currentUser.id,
            type: "MEMBER_UPDATE",
            message: `${currentUser.name} promoted ${targetUser.user.name} to Admin`,
          },
        }),
      ]);

      await pusherServer.trigger(
        `workspace-${workspaceId}`,
        "member-updated",
        updatedMember
      );

      await pusherServer.trigger(
        `notification-${workspaceId}`,
        "member-updated",
        {
          member: updatedMember.user,
          updatedBy: {
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.image,
          },
        }
      );

      return updatedMember;
    }

    if (isAdmin && targetUser.role === "ADMIN" && newRole === "MEMBER") {
      throw {
        error_type: "Forbidden",
        message: "Admin cannot demote another Admin to Member",
      };
    }

    if (isMember) {
      throw {
        error_type: "Forbidden",
        message: "Members cannot change roles",
      };
    }

    throw {
      error_type: "Forbidden",
      message: "No valid role changes allowed",
    };
  } catch (error) {
    console.error("Error updating member role:", error);
    throw error;
  }
}
