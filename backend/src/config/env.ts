import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().url(),

  MONGO_URI: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  EMAIL_PROVIDER: z.enum(['console', 'gmail', 'resend', 'sendgrid']).default('console'),
  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM: z.string().optional(),

  // Power Automate webhook for admin notifications (optional — leave blank or omit to disable)
  POWER_AUTOMATE_WEBHOOK_URL: z.string().url().optional().or(z.literal('')).transform(v => v || undefined),

  GEMINI_API_KEY: z.string().startsWith('AIza').optional(),
  GEMINI_API_KEYS: z.string().optional(), // comma-separated fallback keys

  COOKIE_ENC_KEY: z.string().length(64).optional(),

  ONECOMPILER_API_KEY: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';

/** Parse all available Gemini keys: primary key + comma-separated fallback keys */
export function getGeminiKeys(): string[] {
  const keys: string[] = [];
  if (env.GEMINI_API_KEY) keys.push(env.GEMINI_API_KEY);
  if (env.GEMINI_API_KEYS) {
    for (const k of env.GEMINI_API_KEYS.split(',')) {
      const trimmed = k.trim();
      if (trimmed && trimmed.startsWith('AIza') && !keys.includes(trimmed)) keys.push(trimmed);
    }
  }
  return keys;
}
