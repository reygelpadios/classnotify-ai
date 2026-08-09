import { Router } from "express";
import { prisma } from "@config/prisma";
import { requireAuth, AuthedRequest } from "@middlewares/requireAuth";

const router = Router();

router.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { userId: req.userId },
      include: { course: true },
    });
    res.json({ courses: enrollments.map((e) => e.course) });
  } catch (err) {
    next(err);
  }
});

export default router;
