import { google } from "googleapis";
import prisma from "@/lib/prismadb";

/**
 * Helper function to refresh Google OAuth token
 */
export async function refreshGoogleToken(
  userId: string,
  currentToken: {
    access_token: string | null;
    refresh_token: string | null;
    expires_at: number | null;
  }
) {
  // If no refresh token, we can't refresh
  if (!currentToken.refresh_token) {
    throw new Error("No refresh token available");
  }

  try {
    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL
    );

    // Set credentials
    oauth2Client.setCredentials({
      refresh_token: currentToken.refresh_token,
    });

    // Refresh the token
    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update the database with new tokens
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

    // Return the new credentials
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

/**
 * Get fresh Google OAuth tokens, refreshing if necessary
 */
export async function getFreshGoogleTokens(userEmail: string) {
  try {
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get the user's Google account
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

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    const isTokenExpired =
      userAccount.expires_at && userAccount.expires_at < now;

    // If token is not expired, return current tokens
    if (!isTokenExpired) {
      return userAccount;
    }

    // If token is expired and we have a refresh token, refresh it
    if (userAccount.refresh_token) {
      return await refreshGoogleToken(user.id, userAccount);
    }

    // If token is expired and no refresh token, throw error
    throw new Error(
      "Google access token expired and no refresh token available"
    );
  } catch (error) {
    console.error("Error getting fresh Google tokens:", error);
    throw error;
  }
}
