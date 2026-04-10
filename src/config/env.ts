import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(8080),

  // Keep optional at startup so Cloud Run can boot and show logs/healthz.
  // Endpoints that need these values validate them at request time.
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  FIRESTORE_COLLECTION: z.string().min(1).default('telegram_chats'),

  // Gemini (Generative Language API)
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default('gemini-1.5-flash'),

  // Job auth (protect /jobs/* endpoints)
  JOBS_API_KEY: z.string().min(16).optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('env validation failed (boot will continue):', parsed.error.flatten().fieldErrors);
}

export const env = parsed.success
  ? parsed.data
  : ({
      NODE_ENV: process.env.NODE_ENV,
      PORT: 8080,
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
      TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
      FIRESTORE_COLLECTION: process.env.FIRESTORE_COLLECTION ?? 'telegram_chats',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GEMINI_MODEL: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
      JOBS_API_KEY: process.env.JOBS_API_KEY,
    } as z.infer<typeof EnvSchema>);

export function requireEnv(name: 'TELEGRAM_BOT_TOKEN' | 'GEMINI_API_KEY' | 'JOBS_API_KEY'): string {
  const val = env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

