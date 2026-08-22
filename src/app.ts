/**
 * src/app.ts
 *
 * Express application initialization and middleware pipeline.
 * Separated from server.ts to allow easy testing without binding to a port.
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import { logger } from './shared/utils/logger';
import reviewRoutes from './infrastructure/web/routes/reviewRoutes';
import problemRoutes from './infrastructure/web/routes/problemRoutes';
import authRoutes from './infrastructure/web/routes/authRoutes';
import trackerRoutes from './infrastructure/web/routes/trackerRoutes';
import noteRoutes from './infrastructure/web/routes/noteRoutes';
import streakRoutes from './infrastructure/web/routes/streakRoutes';
import shareRoutes from './infrastructure/web/routes/shareRoutes';
import helmet from 'helmet';
import { requestContext } from './infrastructure/web/middleware/requestContext';

// ─── App Factory ──────────────────────────────────────────────────────────────

export const createApp = () => {
  const app = express();

  // ── Core Middleware ───────────────────────────────────────────────────
  app.use(
    cors({
      origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3001'],
      credentials: true,
    }),
  );

  // Gzip/deflate JSON responses. The heaviest reads (review history, tracker
  // summaries) are large JSON payloads; compression typically shrinks them
  // 70–85% over the wire. See PERFORMANCE.md E6.
  app.use(compression());

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestContext);

  // ── Request Logging ───────────────────────────────────────────────────
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.debug(`→ ${req.method} ${req.path}`);
    next();
  });

  // ── Health Check ──────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'yeap-srs-backend',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] ?? '1.0.0',
    });
  });
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

  // ── API Routes ────────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/review', reviewRoutes);
  app.use('/api/problems', problemRoutes);
  app.use('/api/trackers', trackerRoutes);
  app.use('/api/notes', noteRoutes);
  app.use('/api/streak', streakRoutes);
  app.use('/api/share', shareRoutes);

  // ── 404 Handler ───────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
    });
  });

  // ── Global Error Handler ──────────────────────────────────────────────
  app.use((error: Error & { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    logger.error(`[App] Unhandled error: ${error.message}`, { stack: error.stack });
    res.status(error.status === 400 || error.type === 'entity.parse.failed' ? 400 : 500).json({
      success: false,
      error: 'Internal server error',
    });
  });

  return app;
};
