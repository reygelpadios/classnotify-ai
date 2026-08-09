import { Router } from "express";
import { syncUserClassroom } from "@services/sync.service";
import { requireAuth, AuthedRequest } from "@middlewares/requireAuth";

const router = Router();

router.post("/now", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    await syncUserClassroom(req.userId!);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
