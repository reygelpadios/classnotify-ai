import cron from "node-cron";
import { prisma } from "@config/prisma";
import { logger } from "@utils/logger";
import { getReminderCadence, computeNextFireAt } from "@services/reminderInterval";
import { notifyUser } from "@services/notification.service";
import { reminderMessage, assignmentButtons } from "@telegram/templates";
import { isStubMode } from "@config/env";

/**
 * Runs every minute and fires any ReminderSchedule whose nextFireAt has
 * passed. Because nextFireAt is persisted in Postgres (not just held in an
 * in-memory timer), this survives server restarts — on boot we simply
 * resume checking against whatever's already in the table.
 */
export function startReminderScheduler() {
  cron.schedule("* * * * *", async () => {
    if (isStubMode) return; // avoid hitting a DB that may not be configured yet in stub mode

    const due = await prisma.reminderSchedule.findMany({
      where: {
        active: true,
        nextFireAt: { lte: new Date() },
        user: { settings: { smartRemindersEnabled: true } },
      },
      include: { assignment: { include: { course: true } } },
    });

    for (const schedule of due) {
      const { assignment } = schedule;
      const dueAt = assignment.dueAt;
      if (!dueAt) continue;

      const isOverdue = dueAt.getTime() < Date.now();

      await notifyUser({
        userId: schedule.userId,
        assignmentId: assignment.id,
        type: "reminder",
        text: reminderMessage({
          title: assignment.title,
          courseName: assignment.course.name,
          dueAt,
          classroomLink: assignment.classroomLink,
        }),
        buttons: assignmentButtons(assignment.id, assignment.classroomLink),
      });

      await prisma.reminderHistory.create({
        data: { assignmentId: assignment.id, userId: schedule.userId, kind: isOverdue ? "overdue" : "reminder" },
      });

      const cadence = getReminderCadence(dueAt);
      await prisma.reminderSchedule.update({
        where: { id: schedule.id },
        data: {
          intervalMins: cadence.intervalMins,
          nextFireAt: computeNextFireAt(dueAt),
          lastFiredAt: new Date(),
        },
      });
    }

    if (due.length > 0) {
      logger.info(`[reminders] Fired ${due.length} reminder(s).`);
    }
  });

  logger.info("[reminders] Reminder scheduler registered (every minute, DB-persisted cadence).");
}
