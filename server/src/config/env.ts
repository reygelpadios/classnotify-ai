import "dotenv/config";
import { z } from "zod";

console.log("===== ENV DEBUG =====");
console.log("Working directory:", process.cwd());
console.log(
  "GOOGLE_CLIENT_ID:",
  process.env.GOOGLE_CLIENT_ID ? "SET" : "MISSING"
);
console.log(
  "GOOGLE_CLIENT_SECRET:",
  process.env.GOOGLE_CLIENT_SECRET ? "SET" : "MISSING"
);
console.log(
  "TELEGRAM_BOT_TOKEN:",
  process.env.TELEGRAM_BOT_TOKEN ? "SET" : "MISSING"
);
console.log(
  "GEMINI_API_KEY:",
  process.env.GEMINI_API_KEY ? "SET" : "MISSING"
);
console.log("=====================");

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().default(4000),

  CLIENT_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required"),

  GOOGLE_CLIENT_ID: z
    .string()
    .min(1),

  GOOGLE_CLIENT_SECRET: z
    .string()
    .min(1),

  GOOGLE_REDIRECT_URI: z
    .string()
    .url(),

  TELEGRAM_BOT_TOKEN: z
    .string()
    .min(1),

  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET should be a long random string"),

  TOKEN_ENCRYPTION_KEY: z
    .string()
    .length(
      64,
      "TOKEN_ENCRYPTION_KEY must be a 32-byte value encoded as 64 hex chars"
    ),

  GEMINI_API_KEY: z
    .string()
    .optional(),
});

// In stub/mock mode we don't want a missing secret
// to crash local development.
// Real deployments should fail fast on invalid config.
const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success && process.env.NODE_ENV === "production") {
  console.error(
    "Invalid environment configuration:",
    parsed.error.flatten().fieldErrors
  );

  process.exit(1);
}

export const env = parsed.success
  ? parsed.data
  : (process.env as unknown as z.infer<typeof EnvSchema>);

export const isStubMode =
  !process.env.GOOGLE_CLIENT_ID ||
  !process.env.TELEGRAM_BOT_TOKEN;