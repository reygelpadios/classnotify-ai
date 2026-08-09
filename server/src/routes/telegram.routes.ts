import { Router } from "express";
import crypto from "crypto";
import { prisma } from "@config/prisma";
import { requireAuth, AuthedRequest } from "@middlewares/requireAuth";

const router = Router();

function generateCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase(); // e.g. "A1B2C3D4"
}

router.post("/link-code", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.linkCode.create({ data: { code, userId: req.userId!, expiresAt } });

    res.json({ code, expiresAt });
  } catch (err) {
    next(err);
  }
});

router.get("/status", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const link = await prisma.telegramUser.findUnique({ where: { userId: req.userId } });
    res.json({ linked: Boolean(link?.isActive), username: link?.username ?? null });
  } catch (err) {
    next(err);
  }
});

router.post("/unlink", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    await prisma.telegramUser.updateMany({ where: { userId: req.userId }, data: { isActive: false } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
