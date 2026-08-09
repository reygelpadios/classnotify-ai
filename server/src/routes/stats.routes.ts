import { Router } from "express";
import { prisma } from "@config/prisma";
import { requireAuth, AuthedRequest } from "@middlewares/requireAuth";

const router = Router();

const COMPLETED_STATES = ["TURNED_IN", "RETURNED"] as const;

router.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const now = new Date();

    const [completed, upcoming, overdue, totalCourses] = await Promise.all([
      prisma.assignment.count({ where: { userId, submissionState: { in: [...COMPLETED_STATES] } } }),
      prisma.assignment.count({
        where: { userId, submissionState: { notIn: [...COMPLETED_STATES] }, dueAt: { gte: now } },
      }),
      prisma.assignment.count({
        where: { userId, submissionState: { notIn: [...COMPLETED_STATES] }, dueAt: { lt: now } },
      }),
      prisma.courseEnrollment.count({ where: { userId } }),
    ]);

    res.json({ completed, upcoming, overdue, totalCourses });
  } catch (err) {
    next(err);
  }
});

export default router;
