import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/database';

const router = Router();
const processStartTime = Date.now();

/**
 * Detailed Health Check Endpoint
 * Returns service status, uptime, and database connectivity.
 * Architectural Invariant: Never leaks database credentials, internal hosts, or SQL error stacks.
 */
router.get('/health', async (_req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  const uptimeSeconds = Math.round((Date.now() - processStartTime) / 10) / 100;

  let dbStatus = 'disconnected';
  let latencyMs: number | undefined;

  try {
    const probe = await checkDatabaseHealth();
    if (probe.healthy) {
      dbStatus = 'connected';
      latencyMs = probe.latencyMs;
    }
  } catch {
    dbStatus = 'disconnected';
  }

  const isHealthy = dbStatus === 'connected';
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'ai-marketplace-trust-backend',
    version: '1.0.0',
    timestamp,
    uptimeSeconds,
    database: {
      status: dbStatus,
      ...(latencyMs !== undefined ? { latencyMs } : {})
    }
  });
});

/**
 * Kubernetes / Container Readiness Probe
 * Returns 200 only when the application is fully ready to accept database-backed traffic.
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    const probe = await checkDatabaseHealth();
    if (probe.healthy) {
      res.status(200).json({ status: 'ready', ready: true });
      return;
    }
  } catch {
    // Falls through to 503
  }

  res.status(503).json({ status: 'not_ready', ready: false });
});

/**
 * Kubernetes / Process Liveness Probe
 * Returns 200 to indicate the Node.js event loop is alive.
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

export const healthRoutes = router;
