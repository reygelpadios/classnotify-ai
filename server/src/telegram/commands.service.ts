import { prisma } from "@config/prisma";
import { dailySummaryMessage, weeklySummaryMessage } from "./templates";

const COMPLETED_STATES = ["TURNED_IN", "RETURNED"] as const;

async function requireLinkedUser(chatId: string): Promise<string | null> {
  const link = await prisma.telegramUser.findUnique({ where: { chatId } });
  return link?.isActive ? link.userId : null;
}

export async function handleRegister(chatId: string, username: string | undefined, code: string | undefined) {
  if (!code) {
    return "Send `/register <code>` using the code shown on your dashboard's Settings page.";
  }

  const linkCode = await prisma.linkCode.findUnique({ where: { code } });
  if (!linkCode || linkCode.expiresAt < new Date()) {
    return "That code is invalid or expired. Generate a new one from the dashboard Settings page.";
  }

  await prisma.telegramUser.upsert({
    where: { userId: linkCode.userId },
    create: { userId: linkCode.userId, chatId, username, isActive: true },
    update: { chatId, username, isActive: true },
  });
  await prisma.linkCode.delete({ where: { code } });

  return "✅ Your Telegram is now linked! Try /today or /upcoming to see your assignments.";
}

export async function handleToday(chatId: string): Promise<string> {
  const userId = await requireLinkedUser(chatId);
  if (!userId) return notLinkedMessage();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const items = await prisma.assignment.findMany({
    where: { userId, dueAt: { gte: start, lt: end }, submissionState: { notIn: [...COMPLETED_STATES] } },
    include: { course: true },
    orderBy: { dueAt: "asc" },
  });

  if (items.length === 0) return "🎉 Nothing due today.";
  return dailySummaryMessage(items.map((i) => ({ title: i.title, dueLabel: "Due Today" })));
}

export async function handleUpcoming(chatId: string): Promise<string> {
  const userId = await requireLinkedUser(chatId);
  if (!userId) return notLinkedMessage();

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const items = await prisma.assignment.findMany({
    where: { userId, dueAt: { gte: now, lte: in7Days }, submissionState: { notIn: [...COMPLETED_STATES] } },
    include: { course: true },
    orderBy: { dueAt: "asc" },
    take: 15,
  });

  if (items.length === 0) return "Nothing due in the next 7 days. 👍";

  const lines = items.map((i) => `• *${i.title}* (${i.course.name})\n  Due ${i.dueAt?.toLocaleString()}`);
  return ["📆 *Upcoming Assignments*", "", ...lines].join("\n");
}

export async function handleOverdue(chatId: string): Promise<string> {
  const userId = await requireLinkedUser(chatId);
  if (!userId) return notLinkedMessage();

  const items = await prisma.assignment.findMany({
    where: { userId, dueAt: { lt: new Date() }, submissionState: { notIn: [...COMPLETED_STATES] } },
    include: { course: true },
    orderBy: { dueAt: "asc" },
    take: 15,
  });

  if (items.length === 0) return "You're all caught up — nothing overdue. ✅";

  const lines = items.map((i) => `• *${i.title}* (${i.course.name}) — was due ${i.dueAt?.toLocaleString()}`);
  return ["⚠️ *Overdue Assignments*", "", ...lines].join("\n");
}

export async function handleCompleted(chatId: string): Promise<string> {
  const userId = await requireLinkedUser(chatId);
  if (!userId) return notLinkedMessage();

  const items = await prisma.assignment.findMany({
    where: { userId, submissionState: { in: [...COMPLETED_STATES] } },
    include: { course: true },
    orderBy: { completedAt: "desc" },
    take: 15,
  });

  if (items.length === 0) return "No completed assignments yet.";

  const lines = items.map((i) => `• *${i.title}* (${i.course.name})`);
  return ["✅ *Completed*", "", ...lines].join("\n");
}

export async function handleCourses(chatId: string): Promise<string> {
  const userId = await requireLinkedUser(chatId);
  if (!userId) return notLinkedMessage();

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { userId },
    include: { course: true },
  });

  if (enrollments.length === 0) return "No courses synced yet — check back after the next sync.";

  return ["📚 *Your Courses*", "", ...enrollments.map((e) => `• ${e.course.name}`)].join("\n");
}

export async function handleSettings(chatId: string): Promise<string> {
  const userId = await requireLinkedUser(chatId);
  if (!userId) return notLinkedMessage();

  const settings = await prisma.settings.findUnique({ where: { userId } });
  if (!settings) return "No settings found.";

  return [
    "⚙️ *Settings*",
    "",
    `Daily summary: ${settings.dailySummaryEnabled ? `on @ ${settings.dailySummaryTime}` : "off"}`,
    `Weekly summary: ${settings.weeklySummaryEnabled ? "on" : "off"}`,
    `Smart reminders: ${settings.smartRemindersEnabled ? "on" : "off"}`,
    `Announcements: ${settings.announcementsEnabled ? "on" : "off"}`,
    "",
    "Manage these from the dashboard Settings page.",
  ].join("\n");
}

export async function handleSummary(chatId: string): Promise<string> {
  const userId = await requireLinkedUser(chatId);
  if (!userId) return notLinkedMessage();

  const [completed, remaining, overdue] = await Promise.all([
    prisma.assignment.count({ where: { userId, submissionState: { in: [...COMPLETED_STATES] } } }),
    prisma.assignment.count({
      where: { userId, submissionState: { notIn: [...COMPLETED_STATES] }, dueAt: { gte: new Date() } },
    }),
    prisma.assignment.count({
      where: { userId, submissionState: { notIn: [...COMPLETED_STATES] }, dueAt: { lt: new Date() } },
    }),
  ]);

  return weeklySummaryMessage({ completed, remaining, overdue });
}

export async function handleStatus(chatId: string): Promise<string> {
  const userId = await requireLinkedUser(chatId);
  if (!userId) return notLinkedMessage();

  const [activeReminders, totalAssignments] = await Promise.all([
    prisma.reminderSchedule.count({ where: { userId, active: true } }),
    prisma.assignment.count({ where: { userId } }),
  ]);

  return [
    "📡 *Status*",
    "",
    `Tracked assignments: ${totalAssignments}`,
    `Active reminder schedules: ${activeReminders}`,
    "Classroom sync runs every 5 minutes.",
  ].join("\n");
}

function notLinkedMessage(): string {
  return "You're not linked yet. Go to the dashboard's Settings page, copy the code, and send `/register <code>` here.";
}
