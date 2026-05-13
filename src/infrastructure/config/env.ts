import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  WHATSAPP_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
  WHATSAPP_PROVIDER: z.enum(["clickatell", "twilio"]).default("clickatell"),
  WHATSAPP_API_KEY: z.string().optional(),
  WHATSAPP_WEBHOOK_SECRET: z.string().optional(),
  PUBLIC_MEDIA_BASE_URL: z.string().url().optional()
});

export const env = schema.parse(process.env);
