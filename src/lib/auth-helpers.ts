import { google } from "googleapis";
import prisma from "@/lib/prismadb";

export async function refreshGoogleToken(
  userId: string,
  currentToken: {
    access_token: string | null;
    refresh_token: string | null;
    expires_at: number | null;
  }
) {
  if (!currentToken.refresh_token) {
    throw new Error("No refresh token available");
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL
    );

    oauth2Client.setCredentials({
      refresh_token: currentToken.refresh_token,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    await prisma.account.updateMany({
      where: {
        userId,
        provider: "google",
      },
      data: {
        access_token: credentials.access_token,
        expires_at: credentials.expiry_date
          ? Math.floor(credentials.expiry_date / 1000)
          : null,
        refresh_token: credentials.refresh_token || currentToken.refresh_token,
      },
    });

    return {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || currentToken.refresh_token,
      expires_at: credentials.expiry_date
        ? Math.floor(credentials.expiry_date / 1000)
        : null,
    };
  } catch (error) {
    console.error("Error refreshing Google token:", error);
    throw new Error("Failed to refresh Google access token");
  }
}

export async function getFreshGoogleTokens(userEmail: string) {
  try {
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const userAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        provider: "google",
      },
      select: {
        access_token: true,
        refresh_token: true,
        expires_at: true,
      },
    });

    if (!userAccount) {
      throw new Error("No Google account found");
    }

    const now = Math.floor(Date.now() / 1000);
    const isTokenExpired =
      userAccount.expires_at && userAccount.expires_at < now;

    if (!isTokenExpired) {
      return userAccount;
    }

    if (userAccount.refresh_token) {
      return await refreshGoogleToken(user.id, userAccount);
    }

    throw new Error(
      "Google access token expired and no refresh token available"
    );
  } catch (error) {
    console.error("Error getting fresh Google tokens:", error);
    throw error;
  }
}
