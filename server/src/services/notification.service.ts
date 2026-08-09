import { prisma } from "@config/prisma";
import { telegramService } from "@telegram/bot";
import { logger } from "@utils/logger";
import type { AssignmentButton } from "@telegram/templates";

interface SendArgs {
  userId: string;
  assignmentId?: string;
  type: "new_assignment" | "reminder" | "updated" | "submitted" | "daily_summary" | "weekly_summary";
  text: string;
  buttons?: AssignmentButton[][];
}

export async function notifyUser({ userId, assignmentId, type, text, buttons }: SendArgs) {
  const telegramUser = await prisma.telegramUser.findUnique({ where: { userId } });

  if (!telegramUser || !telegramUser.isActive) {
    logger.debug(`[notify] User ${userId} has no active Telegram link — skipping ${type}.`);
    return;
  }

  let success = true;
  let error: string | undefined;

  try {
    await telegramService.send(telegramUser.chatId, text, { buttons });
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : "Unknown send error";
    logger.error(`[notify] Failed to send ${type} to user ${userId}: ${error}`);
  }

  await prisma.notificationLog.create({
    data: { userId, assignmentId, type, channel: "telegram", success, error, payload: { text } },
  });
}
