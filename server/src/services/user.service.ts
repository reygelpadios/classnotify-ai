import { prisma } from "@config/prisma";
import { encryptToken, decryptToken } from "@utils/crypto";
import { refreshAccessToken } from "./googleAuth.service";
import { logger } from "@utils/logger";
import type { Credentials } from "google-auth-library";

interface GoogleProfile {
  id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
}

/** Called right after OAuth callback exchanges the code for tokens. */
export async function upsertUserFromGoogle(profile: GoogleProfile, tokens: Credentials) {
  if (!tokens.access_token) {
    throw new Error("Google did not return an access_token");
  }

  const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 55 * 60 * 1000);

  const data = {
    email: profile.email,
    name: profile.name ?? undefined,
    avatarUrl: profile.picture ?? undefined,
    accessTokenEnc: encryptToken(tokens.access_token),
    tokenExpiresAt: expiresAt,
    // Google only sends refresh_token on first consent (or when prompt=consent,
    // which we always pass) — guard so we don't overwrite a real one with undefined.
    ...(tokens.refresh_token ? { refreshTokenEnc: encryptToken(tokens.refresh_token) } : {}),
  };

  const user = await prisma.user.upsert({
    where: { googleId: profile.id },
    create: {
      googleId: profile.id,
      email: profile.email,
      name: profile.name ?? undefined,
      avatarUrl: profile.picture ?? undefined,
      accessTokenEnc: encryptToken(tokens.access_token),
      refreshTokenEnc: encryptToken(tokens.refresh_token ?? ""),
      tokenExpiresAt: expiresAt,
      settings: { create: {} },
    },
    update: data,
  });

  return user;
}

/**
 * Returns a valid (decrypted) access token for this user, refreshing and
 * persisting a new one first if the stored token has expired.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const isExpired = user.tokenExpiresAt.getTime() - Date.now() < 60_000; // refresh 1 min early
  if (!isExpired) {
    return decryptToken(user.accessTokenEnc);
  }

  const refreshToken = decryptToken(user.refreshTokenEnc);
  if (!refreshToken) {
    throw new Error(`User ${userId} has no refresh token — must re-authenticate.`);
  }

  logger.info(`[auth] Refreshing expired access token for user ${userId}`);
  const creds = await refreshAccessToken(refreshToken);
  if (!creds.access_token) {
    throw new Error(`Google refresh did not return a new access_token for user ${userId}`);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      accessTokenEnc: encryptToken(creds.access_token),
      tokenExpiresAt: creds.expiry_date ? new Date(creds.expiry_date) : new Date(Date.now() + 55 * 60 * 1000),
    },
  });

  return creds.access_token;
}
