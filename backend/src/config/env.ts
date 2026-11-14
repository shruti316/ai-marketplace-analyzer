import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Attempt to load .env from the working directory or backend root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Strict Zod validation schema for backend environment variables.
 * Enforces database connection parameters, server port, and external service URLs.
 */
export const envSchema = z.object({
  DB_HOST: z.string().min(1, 'DB_HOST is required (e.g., 127.0.0.1)'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  // Optional dedicated credentials for schema migrations
  MIGRATION_DB_USER: z.string().optional(),
  MIGRATION_DB_PASSWORD: z.string().optional(),
  NODE_BACKEND_PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PYTHON_SERVICE_URL: z.string().url().default('http://127.0.0.1:8000')
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Validates and retrieves current environment configuration.
 * Throws a descriptive validation error if required variables are missing or invalid.
 */
export function getEnv(customEnv: Record<string, string | undefined> = process.env): Env {
  if (cachedEnv && customEnv === process.env) {
    return cachedEnv;
  }

  const result = envSchema.safeParse(customEnv);
  if (!result.success) {
    const formatted = result.error.format();
    throw new Error(
      `Database environment validation error:\n${JSON.stringify(formatted, null, 2)}\n` +
      `Please configure the required environment variables in your .env file (see .env.example).`
    );
  }

  if (customEnv === process.env) {
    cachedEnv = result.data;
  }

  return result.data;
}

/**
 * Resets cached environment (primarily for testing and mock runs).
 */
export function resetEnvCache(): void {
  cachedEnv = null;
}
