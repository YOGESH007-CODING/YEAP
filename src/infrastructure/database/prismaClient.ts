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

// ─── Connection pool sizing ───────────────────────────────────────────────────

/**
 * Prisma reads pool settings from the connection string, so tuning them means
 * rewriting the URL. Exposing them as separate env vars lets the same build run
 * with `connection_limit=1` on a serverless deployment and a larger pool on the
 * persistent worker, without maintaining two copies of DATABASE_URL.
 * See PERFORMANCE.md H3.
 *
 * @returns the augmented URL, or undefined to leave DATABASE_URL untouched.
 */
const resolveDatabaseUrl = (): string | undefined => {
  const raw = process.env['DATABASE_URL'];
  const connectionLimit = process.env['DATABASE_CONNECTION_LIMIT'];
  const poolTimeout = process.env['DATABASE_POOL_TIMEOUT'];

  // Nothing to override — let Prisma resolve DATABASE_URL itself, including the
  // missing-variable error, so behaviour is unchanged when these are unset.
  if (!raw || (!connectionLimit && !poolTimeout)) {
    return undefined;
  }

  try {
    const url = new URL(raw);

    // A value already written into DATABASE_URL is the more specific config and wins.
    if (connectionLimit && !url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', connectionLimit);
    }
    if (poolTimeout && !url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', poolTimeout);
    }

    // Log the values, never the URL — it carries credentials.
    logger.info(
      `[Prisma] Pool overrides applied ` +
      `(connection_limit=${url.searchParams.get('connection_limit') ?? 'default'}, ` +
      `pool_timeout=${url.searchParams.get('pool_timeout') ?? 'default'}).`,
    );

    return url.toString();
  } catch {
    logger.warn('[Prisma] DATABASE_URL is not a parseable URL; pool overrides ignored.');
    return undefined;
  }
};

// ─── Singleton Pattern ────────────────────────────────────────────────────────

declare global {
  // Prevents multiple instances in development (module caching)
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  const url = resolveDatabaseUrl();

  const client = new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
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
