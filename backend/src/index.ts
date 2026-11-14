import { Server } from 'node:http';
import { createApp } from './app';
import { getEnv } from './config/env';
import { closeApplicationPool } from './config/database';

// =============================================================================
// AI-Powered Indian Marketplace Trust Intelligence Platform — Server Entry
// =============================================================================

const app = createApp();
let server: Server | null = null;

/**
 * Starts the HTTP server listener on the configured port.
 */
export function startServer(): Server {
  let port = 5000;
  try {
    const env = getEnv();
    port = env.NODE_BACKEND_PORT;
  } catch {
    port = 5000;
  }

  const runningServer = app.listen(port, () => {
    console.log(`[INFO] Marketplace Trust Intelligence Backend listening on port ${port}`);
  });

  return runningServer;
}

/**
 * Handles graceful shutdown upon termination signals (SIGINT, SIGTERM).
 */
export async function handleGracefulShutdown(signal: string, srv: Server | null = server): Promise<void> {
  console.log(`\n[INFO] Received ${signal}. Initiating graceful shutdown...`);

  if (srv) {
    srv.close(async () => {
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
  } else {
    try {
      await closeApplicationPool();
    } catch {
      // Ignore
    }
    process.exit(0);
  }
}

// Start server when executed directly
if (require.main === module) {
  server = startServer();
  process.on('SIGINT', () => handleGracefulShutdown('SIGINT', server));
  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM', server));
}

export { app, server };
