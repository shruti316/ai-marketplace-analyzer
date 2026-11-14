import express, { Request, Response } from 'express';
import cors from 'cors';
import { getEnv } from './config/env';
import { checkDatabaseHealth, closeApplicationPool } from './config/database';

// =============================================================================
// AI-Powered Indian Marketplace Trust Intelligence Platform — Backend Entry
// Express 5.0 Minimal Application Entry Point
// =============================================================================

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// -----------------------------------------------------------------------------
// Health Probe Endpoint
// -----------------------------------------------------------------------------
app.get('/health', async (_req: Request, res: Response) => {
  const timestamp = new Date().toISOString();

  // Attempt database health check if database configuration is present
  let dbHealth: { healthy: boolean; latencyMs?: number; error?: string } = {
    healthy: false,
    error: 'Database not initialized or connection unconfigured'
  };

  try {
    const probe = await checkDatabaseHealth();
    dbHealth = probe;
  } catch (err: unknown) {
    dbHealth = {
      healthy: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }

  const overallStatus = dbHealth.healthy ? 'healthy' : 'degraded';
  const statusCode = dbHealth.healthy ? 200 : 503;

  res.status(statusCode).json({
    status: overallStatus,
    service: 'ai-marketplace-trust-backend',
    version: '1.0.0',
    timestamp,
    database: dbHealth
  });
});

// -----------------------------------------------------------------------------
// Root Status Endpoint
// -----------------------------------------------------------------------------
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'AI-Powered Indian Marketplace Trust Intelligence Platform API',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health'
    }
  });
});

// -----------------------------------------------------------------------------
// Server Lifecycle & Graceful Shutdown
// -----------------------------------------------------------------------------
let port = 5000;
try {
  const env = getEnv();
  port = env.NODE_BACKEND_PORT;
} catch {
  // If .env is not present, use standard default port for bootstrapping
  port = 5000;
}

const server = app.listen(port, () => {
  console.log(`[INFO] Marketplace Trust Intelligence Backend listening on port ${port}`);
});

/**
 * Handles graceful shutdown upon process termination signals.
 */
async function handleGracefulShutdown(signal: string): Promise<void> {
  console.log(`\n[INFO] Received ${signal}. Initiating graceful shutdown...`);

  server.close(async () => {
    console.log('[OK] HTTP server closed.');
    try {
      await closeApplicationPool();
      console.log('[OK] Database connections closed.');
    } catch (err) {
      console.error('[WARN] Error closing database pool:', err);
    }
    process.exit(0);
  });

  // Force close if graceful shutdown exceeds 10 seconds
  setTimeout(() => {
    console.error('[FATAL] Forceful shutdown initiated due to timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

export { app, server };
