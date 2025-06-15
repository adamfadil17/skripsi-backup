import prisma from "@/lib/prismadb";
import { User } from "@prisma/client";

interface CreateWorkspaceInput {
  name: string;
  emoji?: string;
  coverImage?: string;
}

export async function createWorkspace(
  workspaceData: CreateWorkspaceInput,
  currentUser: User
) {
  try {
    if (!currentUser.id || !currentUser.email) {
      throw {
        error_type: "Unauthorized",
        message: "Unauthorized access",
      };
    }

    const { name, emoji, coverImage } = workspaceData;

    if (!name) {
      throw {
        error_type: "BadRequest",
        message: "Workspace name is required",
      };
    }

    const existingWorkspace = await prisma.workspace.findFirst({
      where: {
        name,
        members: {
          some: {
            userId: currentUser.id,
          },
        },
      },
    });

    if (existingWorkspace) {
      throw {
        error_type: "BadRequest",
        message: "Workspace name already exists",
      };
    }

    const newWorkspace = await prisma.workspace.create({
      data: {
        name,
        emoji,
        coverImage,
        googleMeetUrl: null,
        members: {
          create: {
            userId: currentUser.id,
            role: "SUPER_ADMIN",
          },
        },
        conversation: {
          create: {
            messages: {
              create: {
                body: `Welcome to the ${name} workspace! Start collaborating here.`,
                senderId: currentUser.id,
                seenIds: [currentUser.id],
                seenBy: {
                  connect: {
                    id: currentUser.id,
                  },
                },
              },
            },
          },
        },
        documents: {
          create: {
            title: "Getting Started",
            emoji: "🚀",
            coverImage: "/images/cover.png",
            createdById: currentUser.id,
            documentContents: {
              create: {
                content: {
                  type: "doc",
                  content: [
                    {
                      type: "heading",
                      attrs: {
                        level: 1,
                      },
                      content: [
                        {
                          type: "text",
                          text: `Welcome to ${name}!`,
                        },
                      ],
                    },
                    {
                      type: "paragraph",
                      content: [
                        {
                          type: "text",
                          text: "This is your first document. You can start writing here and use all the rich text features available:",
                        },
                      ],
                    },
                    {
                      type: "bulletList",
                      content: [
                        {
                          type: "listItem",
                          content: [
                            {
                              type: "paragraph",
                              content: [
                                {
                                  type: "text",
                                  marks: [{ type: "bold" }],
                                  text: "Bold text",
                                },
                                {
                                  type: "text",
                                  text: " and ",
                                },
                                {
                                  type: "text",
                                  marks: [{ type: "italic" }],
                                  text: "italic text",
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: "listItem",
                          content: [
                            {
                              type: "paragraph",
                              content: [
                                {
                                  type: "text",
                                  text: "Create ",
                                },
                                {
                                  type: "text",
                                  marks: [
                                    {
                                      type: "link",
                                      attrs: {
                                        href: "https://tiptap.dev",
                                        target: "_blank",
                                      },
                                    },
                                  ],
                                  text: "links",
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: "listItem",
                          content: [
                            {
                              type: "paragraph",
                              content: [
                                {
                                  type: "text",
                                  text: "Add images and attachments",
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: "listItem",
                          content: [
                            {
                              type: "paragraph",
                              content: [
                                {
                                  type: "text",
                                  text: "Create tables and task lists",
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: "heading",
                      attrs: {
                        level: 2,
                      },
                      content: [
                        {
                          type: "text",
                          text: "Task List Example",
                        },
                      ],
                    },
                    {
                      type: "taskList",
                      content: [
                        {
                          type: "taskItem",
                          attrs: {
                            checked: true,
                          },
                          content: [
                            {
                              type: "paragraph",
                              content: [
                                {
                                  type: "text",
                                  text: "Set up your workspace",
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: "taskItem",
                          attrs: {
                            checked: false,
                          },
                          content: [
                            {
                              type: "paragraph",
                              content: [
                                {
                                  type: "text",
                                  text: "Invite team members",
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: "taskItem",
                          attrs: {
                            checked: false,
                          },
                          content: [
                            {
                              type: "paragraph",
                              content: [
                                {
                                  type: "text",
                                  text: "Start collaborating!",
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: "blockquote",
                      content: [
                        {
                          type: "paragraph",
                          content: [
                            {
                              type: "text",
                              marks: [{ type: "italic" }],
                              text: "Happy writing! You can delete this content and start fresh whenever you're ready.",
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                editedById: currentUser.id,
              },
            },
          },
        },
      },
      include: {
        members: true,
        conversation: {
          include: {
            messages: {
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },
                seenBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        documents: {
          include: {
            documentContents: true,
            attachments: true,
          },
        },
      },
    });

    return newWorkspace;
  } catch (error) {
    console.error("Error creating workspace:", error);
    throw error;
  }
}
