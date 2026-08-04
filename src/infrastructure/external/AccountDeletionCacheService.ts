import Redis from 'ioredis';
import { logger } from '../../shared/utils/logger';

// The current application does not populate these keys yet. Keeping all
// account-scoped cache names here makes invalidation explicit as caches grow.
export const invalidateAccountCaches = async (userId: string, requestId: string): Promise<void> => {
  const url = process.env['REDIS_URL'];
  if (!url) return;
  const redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, enableReadyCheck: true });
  try {
    await redis.connect();
    await redis.unlink(`user:${userId}`, `user:${userId}:profile`, `user:${userId}:sessions`);
  } catch {
    logger.error('[AccountDeletion] Cache invalidation failed', { requestId });
  } finally {
    try { await redis.quit(); } catch { redis.disconnect(); }
  }
};
