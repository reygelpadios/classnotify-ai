/**
 * Smart Reminder cadence calculator.
 *
 * Given how far away a due date is, returns how often (in minutes) the user
 * should be reminded. Pure function — no DB/IO — so it's easy to unit test
 * and reuse from both the scheduler and any "preview my reminders" UI.
 */

const MINUTE = 1;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface ReminderCadence {
  intervalMins: number;
  label: string;
}

/**
 * @param dueAt        The assignment's due date/time.
 * @param now          Current time (injectable for tests).
 * @returns             The interval (in minutes) between reminders right now,
 *                       or null if the assignment isn't due yet in a way that
 *                       needs reminders (shouldn't normally happen — smart
 *                       reminders start immediately on creation).
 */
export function getReminderCadence(dueAt: Date, now: Date = new Date()): ReminderCadence {
  const minsRemaining = (dueAt.getTime() - now.getTime()) / 60000;

  if (minsRemaining < 0) {
    return { intervalMins: 6 * HOUR, label: "overdue" };
  }
  if (minsRemaining < 1 * HOUR) {
    return { intervalMins: 15 * MINUTE, label: "<1h" };
  }
  if (minsRemaining < 6 * HOUR) {
    return { intervalMins: 1 * HOUR, label: "6h-1h" };
  }
  if (minsRemaining < 24 * HOUR) {
    return { intervalMins: 6 * HOUR, label: "24h-6h" };
  }
  if (minsRemaining < 72 * HOUR) {
    return { intervalMins: 12 * HOUR, label: "72h-24h" };
  }
  if (minsRemaining < 7 * DAY) {
    return { intervalMins: 1 * DAY, label: "7d-3d" };
  }
  return { intervalMins: 2 * DAY, label: ">7d" };
}

/** Computes the next fire time given the current cadence. */
export function computeNextFireAt(dueAt: Date, now: Date = new Date()): Date {
  const { intervalMins } = getReminderCadence(dueAt, now);
  return new Date(now.getTime() + intervalMins * 60000);
}
