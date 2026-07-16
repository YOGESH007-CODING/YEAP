/**
 * src/infrastructure/database/prismaClient.ts
 *
 * Singleton Prisma Client provider.
 *
 * Using a singleton prevents connection pool exhaustion in development
 * due to hot-reloading creating multiple PrismaClient instances.
 */
import { PrismaClient } from '@prisma/client';
declare global {
    var __prismaClient: PrismaClient | undefined;
}
export declare const prisma: PrismaClient;
export declare const disconnectPrisma: () => Promise<void>;
//# sourceMappingURL=prismaClient.d.ts.map