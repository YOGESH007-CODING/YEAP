/**
 * src/infrastructure/database/prismaClient.ts
 *
 * Singleton Prisma Client provider.
 *
 * Using a singleton prevents connection pool exhaustion in development
 * due to hot-reloading creating multiple PrismaClient instances.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../shared/utils/logger';

// ─── Singleton Pattern ────────────────────────────────────────────────────────

declare global {
  // Prevents multiple instances in development (module caching)
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  const client = new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? [
            { level: 'query', emit: 'event' },
            { level: 'error', emit: 'stdout' },
            { level: 'warn', emit: 'stdout' },
          ]
        : [{ level: 'error', emit: 'stdout' }],
  });

  // Log slow queries in development
  if (process.env['NODE_ENV'] === 'development') {
    (client as PrismaClient & {
      $on(event: 'query', callback: (e: { query: string; duration: number }) => void): void;
    }).$on('query', (e) => {
      if (e.duration > 200) {
        logger.warn(`[Prisma] Slow query (${e.duration}ms): ${e.query}`);
      }
    });
  }

  return client;
};

// Reuse existing instance in dev, create new in prod
export const prisma: PrismaClient =
  global.__prismaClient ?? createPrismaClient();

if (process.env['NODE_ENV'] !== 'production') {
  global.__prismaClient = prisma;
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect();
  logger.info('[Prisma] Connection closed.');
};
