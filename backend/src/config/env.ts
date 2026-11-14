import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

/**
 * Resolves the absolute path to the backend `.env` configuration file deterministically.
 * Supports:
 * 1. Explicit path override via process.env.DOTENV_CONFIG_PATH
 * 2. Source development execution under tsx (__dirname = backend/src/config -> ../../.env)
 * 3. Compiled production execution under dist (__dirname = backend/dist/src/config -> ../../../.env)
 * 4. Execution from project root (cwd = repo root -> backend/.env)
 * 5. Execution from backend directory (cwd = backend -> .env)
 */
export function resolveEnvFilePath(): string | null {
  const explicitPath = process.env.DOTENV_CONFIG_PATH;
  if (explicitPath && fs.existsSync(explicitPath)) {
    return path.resolve(explicitPath);
  }

  const candidatePaths = [
    // Development mode (tsx): backend/src/config -> backend/.env
    path.resolve(__dirname, '../../.env'),
    // Production compiled mode (tsc): backend/dist/src/config -> backend/.env
    path.resolve(__dirname, '../../../.env'),
    // Launched from repository root: repo_root/backend/.env
    path.resolve(process.cwd(), 'backend/.env'),
    // Launched from backend directory: backend/.env
    path.resolve(process.cwd(), '.env')
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Loads the environment file into process.env if found, preserving any pre-existing environment variables.
 */
export function loadEnv(customPath?: string): string | null {
  const targetPath = customPath ? path.resolve(customPath) : resolveEnvFilePath();
  if (targetPath && fs.existsSync(targetPath)) {
    dotenv.config({ path: targetPath, override: false });
    return targetPath;
  }
  return null;
}

// Deterministically load backend/.env on module initialization
loadEnv();

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
  PYTHON_SERVICE_URL: z.string().url().default('http://127.0.0.1:8000'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://127.0.0.1:3000'),
  JWT_SECRET: z.string().min(16).default('dev-marketplace-secret-change-in-production-min-32-chars'),
  // Proxy Trust Configuration (for secure IP extraction behind reverse proxies)
  TRUST_PROXY: z.union([z.boolean(), z.number(), z.string()]).default(false),
  // Rate Limiting Parameters (requests per window)
  AUTH_RATE_LIMIT: z.coerce.number().int().min(1).default(10), // 10 attempts per 15 min
  INFERENCE_RATE_LIMIT: z.coerce.number().int().min(1).default(30), // 30 req / min
  HEAVY_OPS_RATE_LIMIT: z.coerce.number().int().min(1).default(40), // 40 req / min
  // Differentiated Upstream Python Timeouts (milliseconds)
  PYTHON_FAST_TIMEOUT_MS: z.coerce.number().int().min(500).default(5000), // 5s for fast queries
  PYTHON_STANDARD_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000), // 10s for reports & evidence
  PYTHON_INFERENCE_TIMEOUT_MS: z.coerce.number().int().min(5000).default(45000) // 45s for neural feature extraction
});

export type Env = z.infer<typeof envSchema>;

/**
 * Returns an array of trimmed, non-empty allowed CORS origins from the environment.
 */
export function getAllowedOrigins(env: Env = getEnv()): string[] {
  return env.CORS_ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
}

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
