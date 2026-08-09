import { Router } from "express";
import { env, isStubMode } from "@config/env";
import { logger } from "@utils/logger";
import { getGoogleConsentUrl, exchangeCodeForTokens, fetchGoogleProfile } from "@services/googleAuth.service";
import { upsertUserFromGoogle } from "@services/user.service";
import { syncUserClassroom } from "@services/sync.service";
import { issueJwt } from "@utils/jwt";
import { requireAuth, AuthedRequest } from "@middlewares/requireAuth";
import { prisma } from "@config/prisma";

const router = Router();

router.get("/google", (req, res) => {
  if (isStubMode) {
    return res.status(501).json({ error: "Google OAuth not configured yet (stub mode) — set GOOGLE_CLIENT_ID/SECRET in .env." });
  }
  res.redirect(getGoogleConsentUrl());
});

router.get("/google/callback", async (req, res, next) => {
  try {
    const code = req.query.code as string | undefined;
    if (!code) {
      return res.redirect(`${env.CLIENT_URL}/login?error=missing_code`);
    }

    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.access_token) {
      return res.redirect(`${env.CLIENT_URL}/login?error=no_access_token`);
    }

    const profile = await fetchGoogleProfile(tokens.access_token);
    if (!profile.id || !profile.email) {
      return res.redirect(`${env.CLIENT_URL}/login?error=incomplete_profile`);
    }

    const user = await upsertUserFromGoogle(
      { id: profile.id, email: profile.email, name: profile.name, picture: profile.picture },
      tokens
    );

    const jwtToken = issueJwt(user.id);
    res.cookie("token", jwtToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    // Kick off an initial sync in the background so the dashboard has data
    // right away, without making the user wait on the redirect.
    syncUserClassroom(user.id).catch((err) =>
      logger.error(`[auth] Initial sync failed for user ${user.id}: ${err instanceof Error ? err.message : err}`)
    );

    res.redirect(`${env.CLIENT_URL}/dashboard`);
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, avatarUrl: true, timezone: true },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

export default router;
