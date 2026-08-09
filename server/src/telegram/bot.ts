import TelegramBot from "node-telegram-bot-api";
import { env, isStubMode } from "@config/env";
import { logger } from "@utils/logger";
import { prisma } from "@config/prisma";
import * as commands from "./commands.service";
import type { AssignmentButton } from "./templates";

/**
 * In stub mode (no TELEGRAM_BOT_TOKEN configured) this exposes the same
 * `send` shape but just logs to the console, so the rest of the app
 * (reminder engine, sync service) can be developed/tested without a real
 * bot token. Swap to real mode by setting TELEGRAM_BOT_TOKEN in .env.
 */

interface SendOptions {
  buttons?: AssignmentButton[][];
}

class TelegramService {
  private bot: TelegramBot | null = null;

  init() {
    if (isStubMode) {
      logger.warn("[telegram] Running in STUB mode — messages will be logged, not sent.");
      return;
    }
    this.bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, { polling: true });
    this.registerCommands();
    this.registerCallbacks();
    logger.info("[telegram] Bot polling started.");
  }

  private registerCommands() {
    if (!this.bot) return;
    const bot = this.bot;

    bot.onText(/^\/start/, (msg) =>
      this.send(msg.chat.id, "Welcome to ClassNotify AI! Use /register <code> to link your account (get the code from your dashboard's Settings page).")
    );

    bot.onText(/^\/register(?:\s+(\S+))?/, async (msg, match) => {
      const reply = await commands.handleRegister(String(msg.chat.id), msg.from?.username, match?.[1]);
      this.send(msg.chat.id, reply);
    });

    bot.onText(/^\/help/, (msg) =>
      this.send(
        msg.chat.id,
        "Commands: /today /upcoming /overdue /completed /courses /settings /summary /status"
      )
    );

    const simple: Record<string, (chatId: string) => Promise<string>> = {
      "/today": commands.handleToday,
      "/upcoming": commands.handleUpcoming,
      "/overdue": commands.handleOverdue,
      "/completed": commands.handleCompleted,
      "/courses": commands.handleCourses,
      "/settings": commands.handleSettings,
      "/summary": commands.handleSummary,
      "/status": commands.handleStatus,
    };

    for (const [command, handler] of Object.entries(simple)) {
      bot.onText(new RegExp(`^${command}\\b`), async (msg) => {
        const reply = await handler(String(msg.chat.id));
        this.send(msg.chat.id, reply);
      });
    }
  }

  private registerCallbacks() {
    if (!this.bot) return;
    const bot = this.bot;

    bot.on("callback_query", async (query) => {
      if (!query.data || !query.message) return;
      const [action, assignmentId] = query.data.split(":");
      const chatId = query.message.chat.id;

      try {
        const assignment = await prisma.assignment.findUnique({
          where: { id: assignmentId },
          include: { course: true },
        });
        if (!assignment) {
          await bot.answerCallbackQuery(query.id, { text: "Assignment not found." });
          return;
        }

        if (action === "view") {
          await bot.answerCallbackQuery(query.id);
          await this.send(
            chatId,
            `📝 *${assignment.title}*\n📚 ${assignment.course.name}\n📅 Due: ${assignment.dueAt?.toLocaleString() ?? "No due date"}\n\nOpen: ${assignment.classroomLink}`
          );
        } else if (action === "snooze") {
          await prisma.reminderSchedule.updateMany({
            where: { assignmentId },
            data: { nextFireAt: new Date(Date.now() + 3 * 60 * 60 * 1000) },
          });
          await bot.answerCallbackQuery(query.id, { text: "Snoozed for 3 hours." });
        } else if (action === "done") {
          await prisma.assignment.update({
            where: { id: assignmentId },
            data: { submissionState: "TURNED_IN", completedAt: new Date() },
          });
          await prisma.reminderSchedule.updateMany({ where: { assignmentId }, data: { active: false } });
          await bot.answerCallbackQuery(query.id, { text: "Marked done!" });
        } else if (action === "open") {
          await bot.answerCallbackQuery(query.id);
        }
      } catch (err) {
        logger.error(`[telegram] callback_query error: ${err instanceof Error ? err.message : err}`);
        await bot.answerCallbackQuery(query.id, { text: "Something went wrong." });
      }
    });
  }

  async send(chatId: number | string, text: string, options: SendOptions = {}) {
    if (isStubMode || !this.bot) {
      logger.info(`[telegram:stub] -> chat ${chatId}: ${text}`);
      return;
    }

    const reply_markup = options.buttons
      ? {
          inline_keyboard: options.buttons.map((row) =>
            row.map((btn) =>
              btn.url ? { text: btn.text, url: btn.url } : { text: btn.text, callback_data: btn.callbackData }
            )
          ),
        }
      : undefined;

    await this.bot.sendMessage(chatId, text, { reply_markup, parse_mode: "Markdown" });
  }
}

export const telegramService = new TelegramService();
