import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  TEMPERATURE: z.string().transform(Number).pipe(z.number().min(0).max(2)).default('0.7'),
  BOT_NAME: z.string().default('Wulang - Kelas Inovatif'),

  RESET_KEYWORD: z.string().default('!reset'),
  MAX_CONTEXT_MESSAGES: z.string().transform(Number).pipe(z.number().positive()).default('10'),
  SESSION_NAME: z.string().default('wulang-ai-session'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const missingVars = error.errors.map((err) => err.path.join('.')).join(', ');
    throw new Error(`Missing or invalid environment variables: ${missingVars}`);
  }
  throw error;
}

export { env };
