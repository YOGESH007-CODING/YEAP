import Redis from 'ioredis';
import type { NextFunction, Request, Response } from 'express';
import { createHash } from 'crypto';
import { logger } from '../../../shared/utils/logger';

const WINDOW_SECONDS = 15 * 60;
const LIMIT = 3;
const memory = new Map<string, { count: number; resetAt: number }>();
let redis: Redis | undefined;

const getRedis = (): Redis | undefined => {
  if (!process.env['REDIS_URL']) return undefined;
  redis ??= new Redis(process.env['REDIS_URL'], { lazyConnect: true, maxRetriesPerRequest: 1, enableReadyCheck: true });
  return redis;
};

const incrementMemory = (key: string): { count: number; ttl: number } => {
  const now = Date.now();
  const existing = memory.get(key);
  const entry = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + WINDOW_SECONDS * 1000 } : existing;
  entry.count += 1;
  memory.set(key, entry);
  return { count: entry.count, ttl: Math.ceil((entry.resetAt - now) / 1000) };
};

export const accountDeletionRateLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
  const ip = createHash('sha256').update(req.ip ?? 'unknown').digest('hex');
  const keys = [`account-delete:user:${userId}`, `account-delete:ip:${ip}`];
  try {
    const connection = getRedis();
    if (!connection) {
      if (process.env['NODE_ENV'] === 'production') throw new Error('Redis is required for account deletion throttling');
      const values = keys.map(incrementMemory);
      if (values.some((value) => value.count > LIMIT)) {
        logger.warn('[AccountDeletion] Request rate-limited', { event: 'account_deletion_rate_limited', userId, requestId: req.requestId });
        res.status(429).json({ success: false, error: 'Too many requests. Try again later.' });
        return;
      }
      next();
      return;
    }
    if (connection.status === 'wait') await connection.connect();
    const values = await Promise.all(keys.map(async (key) => {
      const count = await connection.incr(key);
      if (count === 1) await connection.expire(key, WINDOW_SECONDS);
      return { count, ttl: await connection.ttl(key) };
    }));
    if (values.some((value) => value.count > LIMIT)) {
      logger.warn('[AccountDeletion] Request rate-limited', { event: 'account_deletion_rate_limited', userId, requestId: req.requestId });
      res.setHeader('Retry-After', Math.max(...values.map((value) => value.ttl), 1));
      res.status(429).json({ success: false, error: 'Too many requests. Try again later.' });
      return;
    }
    next();
  } catch (error) {
    logger.error('[AccountDeletion] Rate limiter unavailable', { requestId: req.requestId });
    res.status(503).json({ success: false, error: 'Request could not be processed' });
  }
};
