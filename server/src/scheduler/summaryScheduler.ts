import cron from "node-cron";
import { logger } from "@utils/logger";
import { isStubMode } from "@config/env";
import { prisma } from "@config/prisma";
import { notifyUser } from "@services/notification.service";
import { dailySummaryMessage, weeklySummaryMessage } from "@telegram/templates";

const COMPLETED_STATES = ["TURNED_IN", "RETURNED"] as const;

/** Formats "HH:mm" in a given IANA timezone for comparison against Settings.dailySummaryTime. */
function currentHHmmInTz(timezone: string, now: Date): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  }
}

async function sendDailySummaries(now: Date) {
  const users = await prisma.user.findMany({
    where: { settings: { dailySummaryEnabled: true } },
    include: { settings: true },
  });

  for (const user of users) {
    if (!user.settings) continue;
    const nowHHmm = currentHHmmInTz(user.timezone, now);
    if (nowHHmm !== user.settings.dailySummaryTime) continue;

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 3); // today + next couple days for context

    const items = await prisma.assignment.findMany({
      where: { userId: user.id, dueAt: { gte: start, lt: end }, submissionState: { notIn: [...COMPLETED_STATES] } },
      orderBy: { dueAt: "asc" },
      take: 10,
    });

    if (items.length === 0) continue;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lines = items.map((i) => {
      if (!i.dueAt) return { title: i.title, dueLabel: "No due date" };
      const daysAway = Math.round((i.dueAt.getTime() - today.getTime()) / 86_400_000);
      const dueLabel = daysAway <= 0 ? "Due Today" : daysAway === 1 ? "Tomorrow" : `${daysAway} Days Left`;
      return { title: i.title, dueLabel };
    });

    await notifyUser({ userId: user.id, type: "daily_summary", text: dailySummaryMessage(lines) });
  }
}

async function sendWeeklySummaries() {
  const users = await prisma.user.findMany({
    where: { settings: { weeklySummaryEnabled: true } },
  });

  for (const user of users) {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [completed, remaining, overdue] = await Promise.all([
      prisma.assignment.count({
        where: { userId: user.id, submissionState: { in: [...COMPLETED_STATES] }, completedAt: { gte: oneWeekAgo } },
      }),
      prisma.assignment.count({
        where: { userId: user.id, submissionState: { notIn: [...COMPLETED_STATES] }, dueAt: { gte: new Date() } },
      }),
      prisma.assignment.count({
        where: { userId: user.id, submissionState: { notIn: [...COMPLETED_STATES] }, dueAt: { lt: new Date() } },
      }),
    ]);

    await notifyUser({
      userId: user.id,
      type: "weekly_summary",
      text: weeklySummaryMessage({ completed, remaining, overdue }),
    });
  }
}

export function startSummarySchedulers() {
  // Runs every minute and checks each user's configured local time — simple
  // and correct across timezones, though for very large user counts this
  // should eventually batch by timezone instead of scanning every user.
  cron.schedule("* * * * *", async () => {
    if (isStubMode) return;
    await sendDailySummaries(new Date()).catch((err) =>
      logger.error(`[summary] Daily summary run failed: ${err instanceof Error ? err.message : err}`)
    );
  });

  // Sunday 00:00 UTC — a fixed weekly checkpoint (per-timezone weekly summary
  // is a nice-to-have refinement for later).
  cron.schedule("0 0 * * 0", async () => {
    if (isStubMode) return;
    await sendWeeklySummaries().catch((err) =>
      logger.error(`[summary] Weekly summary run failed: ${err instanceof Error ? err.message : err}`)
    );
  });

  logger.info("[summary] Daily/weekly summary schedulers registered.");
}
