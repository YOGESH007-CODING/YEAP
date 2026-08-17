"use strict";
/**
 * src/infrastructure/repositories/PrismaUserRepository.ts
 *
 * Concrete implementation of IUserRepository using Prisma.
 * Maps Prisma model objects to domain DTOs before returning them.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaUserRepository = void 0;
// ─── Mapper ───────────────────────────────────────────────────────────────────
const toDto = (user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    passwordHash: user.passwordHash,
    provider: user.provider,
    providerId: user.providerId,
    leetcodeUsername: user.leetcodeUsername,
    telegramChatId: user.telegramChatId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});
// ─── Repository ───────────────────────────────────────────────────────────────
class PrismaUserRepository {
    constructor(db) {
        this.db = db;
    }
    async findAll() {
        const users = await this.db.user.findMany({ orderBy: { createdAt: 'asc' } });
        return users.map(toDto);
    }
    async findById(id) {
        const user = await this.db.user.findUnique({ where: { id } });
        return user ? toDto(user) : null;
    }
    async findByEmail(email) {
        const user = await this.db.user.findUnique({ where: { email } });
        return user ? toDto(user) : null;
    }
    async findByProvider(provider, providerId) {
        const user = await this.db.user.findUnique({ where: { provider_providerId: { provider, providerId } } });
        return user ? toDto(user) : null;
    }
    async create(data) {
        const user = await this.db.user.create({
            data: {
                email: data.email,
                name: data.name,
                passwordHash: data.passwordHash,
                provider: data.provider,
                providerId: data.providerId,
                leetcodeUsername: data.leetcodeUsername,
                telegramChatId: data.telegramChatId,
            },
        });
        return toDto(user);
    }
    async update(id, data) {
        const user = await this.db.user.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.leetcodeUsername !== undefined && { leetcodeUsername: data.leetcodeUsername }),
                ...(data.telegramChatId !== undefined && { telegramChatId: data.telegramChatId }),
            },
        });
        return toDto(user);
    }
    async delete(id) {
        await this.db.user.delete({ where: { id } });
    }
}
exports.PrismaUserRepository = PrismaUserRepository;
//# sourceMappingURL=PrismaUserRepository.js.map