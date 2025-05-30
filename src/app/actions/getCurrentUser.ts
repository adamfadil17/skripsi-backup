import prisma from "@/lib/prismadb";
import getSession from "./getSession";

export const getCurrentUser = async () => {
  try {
    const session = await getSession();

    if (!session?.user?.email) return null;

    const currentUser = await prisma.user.findUnique({
      where: {
        email: session.user.email as string,
      },
    });

    if (!currentUser) return null;

    // Simple serialization - converts Dates to strings and removes non-serializable properties
    return JSON.parse(JSON.stringify(currentUser));
  } catch (error: any) {
    console.error("Error in getCurrentUser:", error);
    return null;
  }
};
