import { Router } from "express";
import { prisma } from "@config/prisma";
import { requireAuth, AuthedRequest } from "@middlewares/requireAuth";

const router = Router();

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const { status, courseId, search } = req.query as {
    status?: "upcoming" | "completed" | "overdue";
    courseId?: string;
    search?: string;
  };

  const where: Record<string, unknown> = { userId: req.userId };
  if (courseId) where.courseId = courseId;
  if (search) where.title = { contains: search, mode: "insensitive" };

  if (status === "completed") {
    where.submissionState = { in: ["TURNED_IN", "RETURNED"] };
  } else if (status === "overdue") {
    where.submissionState = { notIn: ["TURNED_IN", "RETURNED"] };
    where.dueAt = { lt: new Date() };
  } else if (status === "upcoming") {
    where.submissionState = { notIn: ["TURNED_IN", "RETURNED"] };
    where.dueAt = { gte: new Date() };
  }

  const assignments = await prisma.assignment.findMany({
    where,
    include: { course: true },
    orderBy: { dueAt: "asc" },
  });

  res.json({ assignments });
});

export default router;
