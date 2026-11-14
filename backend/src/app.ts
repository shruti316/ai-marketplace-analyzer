import express, { Express, Request, Response } from 'express';
import { securityHeaders, buildCorsMiddleware } from './middleware/security';
import { requestLogger } from './middleware/logging';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { healthRoutes } from './routes/health';
import { authRoutes } from './modules/auth/auth.routes';
import { catalogRoutes } from './modules/catalog/catalog.routes';
import { trustRoutes } from './modules/trust/trust.routes';
import { comparisonRoutes } from './modules/comparison/comparison.routes';
import { annotationsRoutes } from './modules/annotations/annotations.routes';

/**
 * Creates and configures the Express 5 application instance.
 * Decoupled from HTTP listener for deterministic, isolated unit testing.
 */
export function createApp(): Express {
  const app = express();

  // 0. Reverse Proxy Trust Configuration (Safe & Configurable)
  try {
    const { getEnv } = require('./config/env');
    const env = getEnv();
    if (env.TRUST_PROXY !== false && env.TRUST_PROXY !== 'false') {
      app.set('trust proxy', env.TRUST_PROXY);
    }
  } catch {
    // Fall back to default (no proxy trust) if env parsing is in flux
  }

  // 1. Security Headers
  app.use(securityHeaders);

  // 2. CORS Policy (Explicit Allowed Origins Whitelist)
  app.use(buildCorsMiddleware());

  // 3. Request Body Parsers with Strict 1MB Size Limit
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 4. Request Logging (Sanitized, No Secrets/Credentials)
  app.use(requestLogger);

  // 5. Root API Discovery Endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'AI-Powered Indian Marketplace Trust Intelligence Platform API',
      status: 'online',
      version: '1.0.0',
      service: 'ai-marketplace-trust-backend',
      endpoints: {
        health: 'GET /health',
        ready: 'GET /ready',
        live: 'GET /live',
        apiHealth: 'GET /api/v1/health',
        auth: {
          login: 'POST /api/v1/auth/login',
          me: 'GET /api/v1/auth/me',
          logout: 'POST /api/v1/auth/logout'
        },
        catalog: {
          products: 'GET /api/v1/products',
          productDetail: 'GET /api/v1/products/:id',
          listings: 'GET /api/v1/listings',
          listingDetail: 'GET /api/v1/listings/:id',
          brands: 'GET /api/v1/brands',
          platforms: 'GET /api/v1/platforms',
          sellerDetail: 'GET /api/v1/sellers/:id'
        },
        trust: {
          trustAssessment: 'GET /api/v1/products/:id/trust-assessment',
          learnedMultimodal: 'GET /api/v1/products/:id/learned-multimodal',
          evidence: 'GET /api/v1/products/:id/evidence',
          report: 'GET /api/v1/products/:id/report',
          sellerTrust: 'GET /api/v1/sellers/:id/trust-assessment',
          listingTrust: 'GET /api/v1/listings/:id/trust-assessment',
          ablations: 'GET /api/v1/ablations'
        },
        comparisons: {
          create: 'POST /api/v1/comparisons',
          list: 'GET /api/v1/comparisons',
          detail: 'GET /api/v1/comparisons/:id',
          delete: 'DELETE /api/v1/comparisons/:id'
        },
        annotations: {
          tasks: 'GET /api/v1/annotations/tasks',
          assign: 'POST /api/v1/annotations/tasks/:id/assign',
          detail: 'GET /api/v1/annotations/tasks/:id',
          submit: 'POST /api/v1/annotations/tasks/:id/submit',
          adjudicate: 'POST /api/v1/annotations/tasks/:id/adjudicate'
        }
      }
    });
  });

  // 6. Mount Health and Readiness Routes
  app.use(healthRoutes);
  app.use('/api/v1', healthRoutes);

  // 7. Mount Domain API Modules
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/comparisons', comparisonRoutes);
  app.use('/api/v1/annotations', annotationsRoutes);
  app.use('/api/v1', trustRoutes);
  app.use('/api/v1', catalogRoutes);

  // 8. Centralized 404 Route Handler
  app.use(notFoundHandler);

  // 9. Centralized Global Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
