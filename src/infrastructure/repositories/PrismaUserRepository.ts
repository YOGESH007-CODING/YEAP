/**
 * src/infrastructure/repositories/PrismaUserRepository.ts
 *
 * Concrete implementation of IUserRepository using Prisma.
 * Maps Prisma model objects to domain DTOs before returning them.
 */

import type { PrismaClient, User } from '@prisma/client';
import type {
  IUserRepository,
  UserDto,
  CreateUserDto,
  UpdateUserDto,
} from '../../domain/interfaces/IUserRepository';

// ─── Mapper ───────────────────────────────────────────────────────────────────

const toDto = (user: User): UserDto => ({
  id: user.id,
  email: user.email,
  name: user.name,
  passwordHash: user.passwordHash,
  googleId: user.googleId,
  leetcodeUsername: user.leetcodeUsername,
  telegramChatId: user.telegramChatId,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ─── Repository ───────────────────────────────────────────────────────────────

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<UserDto | null> {
    const user = await this.db.user.findUnique({ where: { id } });
    return user ? toDto(user) : null;
  }

  async findByEmail(email: string): Promise<UserDto | null> {
    const user = await this.db.user.findUnique({ where: { email } });
    return user ? toDto(user) : null;
  }

  async findByGoogleId(googleId: string): Promise<UserDto | null> {
    const user = await this.db.user.findUnique({ where: { googleId } });
    return user ? toDto(user) : null;
  }

  async create(data: CreateUserDto): Promise<UserDto> {
    const user = await this.db.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        googleId: data.googleId,
        leetcodeUsername: data.leetcodeUsername,
        telegramChatId: data.telegramChatId,
      },
    });
    return toDto(user);
  }

  async update(id: string, data: UpdateUserDto): Promise<UserDto> {
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

  async delete(id: string): Promise<void> {
    await this.db.user.delete({ where: { id } });
  }
}
