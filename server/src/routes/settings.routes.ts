import { Router } from "express";
import { z } from "zod";
import { prisma } from "@config/prisma";
import { requireAuth, AuthedRequest } from "@middlewares/requireAuth";

const router = Router();

const SettingsUpdateSchema = z.object({
  dailySummaryEnabled: z.boolean().optional(),
  dailySummaryTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Expected HH:mm")
    .optional(),
  weeklySummaryEnabled: z.boolean().optional(),
  weeklySummaryDay: z.number().min(0).max(6).optional(),
  smartRemindersEnabled: z.boolean().optional(),
  announcementsEnabled: z.boolean().optional(),
  timezone: z.string().optional(),
});

router.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const [settings, user] = await Promise.all([
      prisma.settings.findUnique({ where: { userId: req.userId } }),
      prisma.user.findUnique({ where: { id: req.userId }, select: { timezone: true } }),
    ]);
    res.json({ settings, timezone: user?.timezone });
  } catch (err) {
    next(err);
  }
});

router.put("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const parsed = SettingsUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { timezone, ...settingsFields } = parsed.data;

    const [settings] = await Promise.all([
      prisma.settings.upsert({
        where: { userId: req.userId! },
        create: { userId: req.userId!, ...settingsFields },
        update: settingsFields,
      }),
      timezone ? prisma.user.update({ where: { id: req.userId }, data: { timezone } }) : Promise.resolve(),
    ]);

    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

export default router;
