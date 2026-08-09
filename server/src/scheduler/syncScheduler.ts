import cron from "node-cron";
import { logger } from "@utils/logger";
import { isStubMode } from "@config/env";
import { syncAllUsers } from "@services/sync.service";

/**
 * Every 5 minutes: pull courses/assignments/announcements/submission status
 * for every connected user and diff against the DB (see sync.service.ts for
 * the create/update/notify logic — it never duplicates rows, keyed off
 * each course/courseWork's Google id).
 */
export function startSyncScheduler() {
  cron.schedule("*/5 * * * *", async () => {
    if (isStubMode) {
      logger.info("[sync] (stub) would sync all users' Classroom data now.");
      return;
    }
    logger.info("[sync] Running Classroom sync...");
    await syncAllUsers();
  });

  logger.info("[sync] Sync scheduler registered (every 5 minutes).");
}
