import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { env, isStubMode } from "@config/env";
import { logger } from "@utils/logger";
import routes from "@routes/index";
import { errorHandler, notFoundHandler } from "@middlewares/errorHandler";
import { telegramService } from "@telegram/bot";
import { startSyncScheduler } from "@scheduler/syncScheduler";
import { startReminderScheduler } from "@scheduler/reminderScheduler";
import { startSummarySchedulers } from "@scheduler/summaryScheduler";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`ClassNotify AI server listening on :${PORT}${isStubMode ? " (STUB MODE — no real Google/Telegram creds)" : ""}`);

  telegramService.init();
  startSyncScheduler();
  startReminderScheduler();
  startSummarySchedulers();
});
