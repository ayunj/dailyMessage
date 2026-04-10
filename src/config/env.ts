import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(8080),

  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  FIRESTORE_COLLECTION: z.string().min(1).default('telegram_chats'),

  // Gemini (Generative Language API)
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default('gemini-1.5-flash'),

  // Job auth (protect /jobs/* endpoints)
  JOBS_API_KEY: z.string().min(16),
});

export const env = EnvSchema.parse(process.env);

