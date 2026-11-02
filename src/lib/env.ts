import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  ALLOWED_EMAIL: z.string().email("ALLOWED_EMAIL must be a valid email"),
  APP_TIMEZONE: z.string().default("Asia/Dhaka"),
  APP_URL: z.string().url("APP_URL must be a valid URL").default("http://localhost:3000"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 chars"),
  GMAIL_USER: z.string().email().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  REMINDER_TO: z.string().email().optional(),
  OWNER_PASSWORD: z.string().optional(),
  E2E_EMAIL: z.string().optional(),
  E2E_PASSWORD: z.string().optional(),
  EMAIL_MOCK: z.string().optional(),
  VERCEL_ENV: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`[Env Error] Environment validation failed:\n${missing}`);
  }

  const env = parsed.data;

  // Strict check: refuse to run with EMAIL_MOCK=1 in production
  if (env.EMAIL_MOCK === "1" && env.VERCEL_ENV === "production") {
    throw new Error("[Env Error] EMAIL_MOCK=1 is forbidden in production (VERCEL_ENV=production)");
  }

  return env;
}

export const env = validateEnv();
