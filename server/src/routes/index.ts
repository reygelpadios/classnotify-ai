import { Router } from "express";
import authRoutes from "./auth.routes";
import assignmentsRoutes from "./assignments.routes";
import telegramRoutes from "./telegram.routes";
import settingsRoutes from "./settings.routes";
import coursesRoutes from "./courses.routes";
import statsRoutes from "./stats.routes";
import syncRoutes from "./sync.routes";
import aiRoutes from "./ai.routes";

const router = Router();

router.get("/health", (req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

router.use("/auth", authRoutes);
router.use("/assignments", assignmentsRoutes);
router.use("/telegram", telegramRoutes);
router.use("/settings", settingsRoutes);
router.use("/courses", coursesRoutes);
router.use("/stats", statsRoutes);
router.use("/sync", syncRoutes);
router.use("/ai", aiRoutes);

export default router;
