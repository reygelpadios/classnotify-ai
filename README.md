# ClassNotify AI

Never miss a Google Classroom assignment — automatic sync + smart Telegram reminders.

This repo is scaffolded for **Phase 0** of the build. It runs end-to-end in **stub mode**
(no real Google/Telegram credentials required) so you can develop and test the reminder
logic, DB schema, and dashboard shell before wiring up real APIs.

## Structure

```
classnotify-ai/
├── client/          Next.js + Tailwind dashboard
├── server/          Express + TS API, scheduler, Telegram bot
│   └── src/
│       ├── config/        env loading, Prisma client
│       ├── controllers/   (Phase 1+)
│       ├── middlewares/   auth, error handling
│       ├── routes/        REST API
│       ├── scheduler/     sync / reminders / summaries (node-cron)
│       ├── services/      business logic (reminder cadence calculator, etc.)
│       ├── telegram/      bot + message templates
│       └── utils/         logger, token encryption
└── prisma/
    └── schema.prisma  Users, Courses, Assignments, ReminderSchedule, etc.
```

## Setup

```bash
npm install                       # installs both workspaces
cp .env.example .env               # fill in DATABASE_URL at minimum to leave stub mode for DB
npm run prisma:generate
npm run prisma:migrate             # creates tables in your Postgres instance
```

Run in two terminals:

```bash
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:3000
```

### Stub mode

If `GOOGLE_CLIENT_ID` or `TELEGRAM_BOT_TOKEN` are unset, the server starts in **stub mode**:
the Telegram service logs messages to the console instead of sending them, and the sync/
OAuth routes return `501 Not Implemented` placeholders. This lets you build and test
everything else (schema, reminder cadence math, dashboard UI) without live credentials.

Fill in `.env` with real values to leave stub mode — see `.env.example` for the full list
(Google OAuth client ID/secret, Telegram bot token from @BotFather, a 32-byte hex
`TOKEN_ENCRYPTION_KEY` for encrypting stored OAuth tokens, etc).

## What's implemented

**Phase 0 — scaffold**
- Full Prisma schema for all entities in the spec.
- Express app with security middleware, centralized error handling, `/api/health`.
- Smart reminder cadence algorithm, cron scaffolding, Telegram bot stub, Next.js + Tailwind shell.

**Phase 1 — Google OAuth + Classroom sync**
- Full OAuth flow (`/api/auth/google` → callback), encrypted token storage, auto-refresh.
- Classroom API client (courses, courseWork, announcements, submissions).
- `sync.service.ts` diffs against the DB: creates new assignments + reminder schedules,
  detects title/description/due-date edits, detects submission-state changes
  (cancels reminders on submit, resumes on reclaim) — all keyed off Google's own ids
  so re-syncing never duplicates rows.

**Phase 2 — Telegram commands + account linking**
- `/register <code>` links a Telegram chat to a user account, via a short-lived code
  generated from the dashboard Settings page (`LinkCode` model, 15 min expiry).
- `/today /upcoming /overdue /completed /courses /settings /summary /status` all query
  real data (`telegram/commands.service.ts`).
- Interactive buttons (View / Open Classroom / Remind Later / Mark Done) on assignment
  notifications, handled via `callback_query` in `telegram/bot.ts`.

**Phase 3 — Reminder sending**
- `reminderScheduler.ts` now actually sends the due reminder (with buttons), logs it to
  `ReminderHistory`, and recomputes the next cadence/fire time — persisted, so it
  survives restarts. Respects the user's `smartRemindersEnabled` setting.

**Phase 4 — Summaries & updates**
- Daily summary at each user's configured local time (`Settings.dailySummaryTime` +
  `User.timezone`); weekly summary every Sunday. Both content-complete, matching the
  spec's example copy.
- Assignment-update detection (title/description/due date) was implemented as part of
  the sync pipeline in Phase 1 since it's the same diffing pass.

**Phase 5 — Dashboard (UI finished)**
- `/login` — real "Sign in with Google" link.
- `/dashboard` — stat cards (upcoming/overdue/completed/courses), status tabs, course
  filter, search, a manual "Sync now" button, dark mode.
- `/dashboard/calendar` — month-grid calendar with assignments plotted on their due date.
- `/dashboard/settings` — Telegram link-code flow + unlink, all notification toggles
  (smart reminders, announcements, daily/weekly summary + time), timezone.
- Auth-guarded layout (redirects to `/login` if the session cookie is missing/expired),
  shared `lib/api.ts` fetch wrapper, `lib/types.ts` mirroring the Prisma models.

**Phase 6 — AI study assistant**
- `services/ai.service.ts` calls the Anthropic API (`ANTHROPIC_API_KEY`) to estimate
  time, difficulty, and a study plan for an assignment, persisted onto
  `Assignment.aiEstimatedMinutes/aiDifficulty/aiStudyPlan`.
- `POST /api/ai/analyze/:assignmentId` triggers it.
- `components/AiStudyAssistant.tsx` is embedded in every `AssignmentCard` on the
  dashboard — click "✨ AI Study Assistant" to analyze on demand, results are cached
  on the assignment so they load instantly next time (with a "Re-analyze" option).
- Safe no-op if `ANTHROPIC_API_KEY` isn't set — the button shows a clear inline
  message instead of erroring ("add an ANTHROPIC_API_KEY on the server to enable this").

## Not yet done

| Phase | Remaining scope |
|---|---|
| 7 | Production deploy: push to Vercel (client) + Railway/Render (server) + Neon/Supabase (DB), set real env vars, remove `prompt: "consent"` if you don't want a forced re-consent every login |

## What you'll need to plug in to go live

1. **Google Cloud Console** — OAuth client (Web application), redirect URI
   `https://<your-server-domain>/api/auth/google/callback`, Classroom API enabled.
   → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
2. **@BotFather on Telegram** — create a bot, grab the token.
   → `TELEGRAM_BOT_TOKEN`.
3. **Postgres** (Neon/Supabase/local) → `DATABASE_URL`, then `npm run prisma:migrate`.
4. **Anthropic API key** (optional, only needed for Phase 6) → `ANTHROPIC_API_KEY`.
5. Generate `JWT_SECRET` (any long random string) and `TOKEN_ENCRYPTION_KEY`
   (32 random bytes as hex — e.g. `openssl rand -hex 32`).

Until those are set, the server runs in **stub mode**: Telegram messages log to the
console instead of sending, and `/api/auth/google` returns a 501 instead of redirecting.
Everything else — schema, dashboard UI, reminder math, sync diffing logic — is fully
built and ready to go the moment real credentials are dropped into `.env`.

## Trying Phase 1 locally

1. Create OAuth credentials in Google Cloud Console (OAuth client ID -> Web
   application). Add `http://localhost:4000/api/auth/google/callback` as an
   authorized redirect URI, and enable the Google Classroom API for the project.
2. Fill in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` in `.env`
   (a `TELEGRAM_BOT_TOKEN` is still needed too, or the server stays in stub mode).
3. `npm run prisma:migrate`, then `npm run dev:server`.
4. Visit `http://localhost:4000/api/auth/google` in a browser to start the consent flow.
   You'll be redirected to `CLIENT_URL/dashboard` on success, with a session cookie set
   and an initial Classroom sync already running in the background.

## Notes on the schema

- OAuth tokens are stored **encrypted** (`accessTokenEnc` / `refreshTokenEnc`, AES-256-GCM
  via `server/src/utils/crypto.ts`) — never persisted in plaintext.
- `Assignment.submissionState` is an enum matching the Classroom API's real values
  (`NEW`, `CREATED`, `TURNED_IN`, `RETURNED`, `RECLAIMED_BY_STUDENT`).
- `ReminderSchedule.nextFireAt` is persisted (not held only in memory), so a server
  restart doesn't lose reminder timing — the scheduler just resumes checking the table.
- `NotificationLog` exists separately from `ReminderHistory` so you can track *all*
  outbound notifications (new assignment, updates, summaries) for debugging/analytics,
  not just reminder pings.
