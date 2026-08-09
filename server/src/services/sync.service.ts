import { Assignment, SubmissionState } from "@prisma/client";
import { prisma } from "@config/prisma";
import { logger } from "@utils/logger";
import { getValidAccessToken } from "./user.service";
import {
  listActiveCourses,
  listCourseWork,
  listAnnouncements,
  getMySubmission,
  courseWorkLink,
  toDueDate,
} from "./classroom.service";
import { getReminderCadence, computeNextFireAt } from "./reminderInterval";
import { notifyUser } from "./notification.service";
import { newAssignmentMessage, updatedMessage, submittedMessage, assignmentButtons } from "@telegram/templates";

const COMPLETED_STATES: SubmissionState[] = ["TURNED_IN", "RETURNED"];

function mapClassroomState(raw: string | null | undefined): SubmissionState {
  const allowed: SubmissionState[] = ["NEW", "CREATED", "TURNED_IN", "RETURNED", "RECLAIMED_BY_STUDENT"];
  return allowed.includes(raw as SubmissionState) ? (raw as SubmissionState) : "CREATED";
}

/** Runs a full sync for a single user. Safe to call repeatedly — never duplicates rows. */
export async function syncUserClassroom(userId: string) {
  const accessToken = await getValidAccessToken(userId);
  const courses = await listActiveCourses(accessToken);

  for (const course of courses) {
    if (!course.id) continue;

    const dbCourse = await prisma.course.upsert({
      where: { googleCourseId: course.id },
      create: {
        googleCourseId: course.id,
        name: course.name ?? "Untitled course",
        section: course.section ?? undefined,
        courseLink: course.alternateLink ?? undefined,
      },
      update: {
        name: course.name ?? "Untitled course",
        section: course.section ?? undefined,
        courseLink: course.alternateLink ?? undefined,
      },
    });

    await prisma.courseEnrollment.upsert({
      where: { userId_courseId: { userId, courseId: dbCourse.id } },
      create: { userId, courseId: dbCourse.id },
      update: {},
    });

    await syncCourseWork(userId, accessToken, dbCourse.id, dbCourse.name, course.id);
    await syncAnnouncements(accessToken, dbCourse.id, course.id);
  }

  logger.info(`[sync] Completed sync for user ${userId} (${courses.length} course(s)).`);
}

async function syncCourseWork(
  userId: string,
  accessToken: string,
  dbCourseId: string,
  courseName: string,
  googleCourseId: string
) {
  const courseWorkItems = await listCourseWork(accessToken, googleCourseId);

  for (const cw of courseWorkItems) {
    if (!cw.id) continue;

    const dueAt = toDueDate(cw.dueDate, cw.dueTime);
    const classroomLink = cw.alternateLink ?? courseWorkLink(googleCourseId, cw.id);

    const submission = await getMySubmission(accessToken, googleCourseId, cw.id).catch(() => undefined);
    const submissionState = mapClassroomState(submission?.state);

    const existing = await prisma.assignment.findUnique({
      where: { userId_googleCourseWorkId: { userId, googleCourseWorkId: cw.id } },
    });

    if (!existing) {
      await handleNewAssignment(userId, dbCourseId, courseName, cw, dueAt, classroomLink, submissionState);
    } else {
      await handleExistingAssignment(userId, courseName, existing, cw, dueAt, classroomLink, submissionState);
    }
  }
}

async function handleNewAssignment(
  userId: string,
  dbCourseId: string,
  courseName: string,
  cw: { id: string; title?: string | null; description?: string | null; creationTime?: string | null },
  dueAt: Date | null,
  classroomLink: string,
  submissionState: SubmissionState
) {
  const assignment = await prisma.assignment.create({
    data: {
      googleCourseWorkId: cw.id,
      courseId: dbCourseId,
      userId,
      title: cw.title ?? "Untitled assignment",
      description: cw.description ?? undefined,
      dueAt,
      creationTime: cw.creationTime ? new Date(cw.creationTime) : new Date(),
      classroomLink,
      submissionState,
      completedAt: COMPLETED_STATES.includes(submissionState) ? new Date() : undefined,
    },
  });

  // Only schedule reminders if the assignment isn't already done and has a due date.
  if (dueAt && !COMPLETED_STATES.includes(submissionState)) {
    const cadence = getReminderCadence(dueAt);
    await prisma.reminderSchedule.create({
      data: {
        assignmentId: assignment.id,
        userId,
        active: true,
        intervalMins: cadence.intervalMins,
        nextFireAt: computeNextFireAt(dueAt),
      },
    });
  }

  await notifyUser({
    userId,
    assignmentId: assignment.id,
    type: "new_assignment",
    text: newAssignmentMessage({ title: assignment.title, courseName, dueAt, classroomLink }),
    buttons: assignmentButtons(assignment.id, classroomLink),
  });

  logger.info(`[sync] New assignment detected: "${assignment.title}" (user ${userId}).`);
}

async function handleExistingAssignment(
  userId: string,
  courseName: string,
  existing: Assignment,
  cw: { title?: string | null; description?: string | null },
  dueAt: Date | null,
  classroomLink: string,
  submissionState: SubmissionState
) {
  const titleChanged = cw.title && cw.title !== existing.title;
  const descriptionChanged = cw.description !== undefined && cw.description !== existing.description;
  const dueDateChanged =
    (dueAt?.getTime() ?? null) !== (existing.dueAt?.getTime() ?? null);

  if (titleChanged || descriptionChanged || dueDateChanged) {
    const oldDue = existing.dueAt;

    await prisma.assignment.update({
      where: { id: existing.id },
      data: {
        title: cw.title ?? existing.title,
        description: cw.description ?? existing.description,
        dueAt,
        classroomLink,
      },
    });

    if (dueDateChanged && dueAt) {
      const cadence = getReminderCadence(dueAt);
      await prisma.reminderSchedule.upsert({
        where: { assignmentId: existing.id },
        create: {
          assignmentId: existing.id,
          userId,
          active: !COMPLETED_STATES.includes(submissionState),
          intervalMins: cadence.intervalMins,
          nextFireAt: computeNextFireAt(dueAt),
        },
        update: {
          intervalMins: cadence.intervalMins,
          nextFireAt: computeNextFireAt(dueAt),
        },
      });

      await notifyUser({
        userId,
        assignmentId: existing.id,
        type: "updated",
        text: updatedMessage({
          title: existing.title,
          oldDue: oldDue ? oldDue.toLocaleString() : "Not set",
          newDue: dueAt.toLocaleString(),
        }),
      });
    }

    logger.info(`[sync] Assignment updated: "${existing.title}" (user ${userId}).`);
  }

  await syncSubmissionState(userId, courseName, existing, submissionState);
}

async function syncSubmissionState(
  userId: string,
  courseName: string,
  existing: Assignment,
  newState: SubmissionState
) {
  if (newState === existing.submissionState) return;

  const wasCompleted = COMPLETED_STATES.includes(existing.submissionState);
  const isNowCompleted = COMPLETED_STATES.includes(newState);

  await prisma.assignment.update({
    where: { id: existing.id },
    data: {
      submissionState: newState,
      completedAt: isNowCompleted ? new Date() : wasCompleted ? null : existing.completedAt,
    },
  });

  if (!wasCompleted && isNowCompleted) {
    // Submitted or returned — stop reminders and celebrate.
    await prisma.reminderSchedule.updateMany({
      where: { assignmentId: existing.id },
      data: { active: false },
    });

    await notifyUser({
      userId,
      assignmentId: existing.id,
      type: "submitted",
      text: submittedMessage({ title: existing.title, courseName }),
    });

    logger.info(`[sync] Assignment submitted: "${existing.title}" (user ${userId}).`);
  } else if (wasCompleted && newState === "RECLAIMED_BY_STUDENT" && existing.dueAt) {
    // Student pulled the submission back — resume reminders.
    const cadence = getReminderCadence(existing.dueAt);
    await prisma.reminderSchedule.upsert({
      where: { assignmentId: existing.id },
      create: {
        assignmentId: existing.id,
        userId,
        active: true,
        intervalMins: cadence.intervalMins,
        nextFireAt: computeNextFireAt(existing.dueAt),
      },
      update: {
        active: true,
        intervalMins: cadence.intervalMins,
        nextFireAt: computeNextFireAt(existing.dueAt),
      },
    });

    logger.info(`[sync] Assignment reclaimed, reminders resumed: "${existing.title}" (user ${userId}).`);
  }
}

async function syncAnnouncements(accessToken: string, dbCourseId: string, googleCourseId: string) {
  const announcements = await listAnnouncements(accessToken, googleCourseId);

  for (const a of announcements) {
    if (!a.id) continue;
    await prisma.announcement.upsert({
      where: { googleAnnounceId: a.id },
      create: {
        googleAnnounceId: a.id,
        courseId: dbCourseId,
        text: a.text ?? "",
        creationTime: a.creationTime ? new Date(a.creationTime) : new Date(),
      },
      update: { text: a.text ?? "" },
    });
  }
}

/** Syncs every user who has a refresh token on file. Called by the cron scheduler. */
export async function syncAllUsers() {
  const users = await prisma.user.findMany({ select: { id: true } });

  for (const { id } of users) {
    try {
      await syncUserClassroom(id);
    } catch (err) {
      logger.error(`[sync] Failed to sync user ${id}: ${err instanceof Error ? err.message : err}`);
    }
  }
}
