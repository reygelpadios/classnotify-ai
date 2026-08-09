import { Router } from "express";
import { prisma } from "@config/prisma";
import { requireAuth, AuthedRequest } from "@middlewares/requireAuth";
import { chatWithClassroom } from "@services/aiChat.service";
import { AppError } from "@middlewares/errorHandler";

const router = Router();

router.post("/chat", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { message, courseIds } = req.body as { message?: string; courseIds?: string[] | "all" };

    if (!message || !message.trim()) {
      return next(new AppError("Message is required", 400));
    }

    const response = await chatWithClassroom(req.userId!, {
      message: message.trim(),
      courseIds: courseIds ?? "all",
    });

    res.json({ response });
  } catch (err) {
    next(err);
  }
});

export default router;
