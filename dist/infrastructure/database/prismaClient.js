"use strict";
/**
 * src/infrastructure/database/prismaClient.ts
 *
 * Singleton Prisma Client provider.
 *
 * Using a singleton prevents connection pool exhaustion in development
 * due to hot-reloading creating multiple PrismaClient instances.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectPrisma = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../../shared/utils/logger");
const createPrismaClient = () => {
    const client = new client_1.PrismaClient({
        log: process.env['NODE_ENV'] === 'development'
            ? [
                { level: 'query', emit: 'event' },
                { level: 'error', emit: 'stdout' },
                { level: 'warn', emit: 'stdout' },
            ]
            : [{ level: 'error', emit: 'stdout' }],
    });
    // Log slow queries in development
    if (process.env['NODE_ENV'] === 'development') {
        client.$on('query', (e) => {
            if (e.duration > 200) {
                logger_1.logger.warn(`[Prisma] Slow query (${e.duration}ms): ${e.query}`);
            }
        });
    }
    return client;
};
// Reuse existing instance in dev, create new in prod
exports.prisma = global.__prismaClient ?? createPrismaClient();
if (process.env['NODE_ENV'] !== 'production') {
    global.__prismaClient = exports.prisma;
}
// ─── Graceful shutdown ────────────────────────────────────────────────────────
const disconnectPrisma = async () => {
    await exports.prisma.$disconnect();
    logger_1.logger.info('[Prisma] Connection closed.');
};
exports.disconnectPrisma = disconnectPrisma;
//# sourceMappingURL=prismaClient.js.map