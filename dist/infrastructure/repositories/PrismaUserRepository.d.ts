/**
 * src/infrastructure/repositories/PrismaUserRepository.ts
 *
 * Concrete implementation of IUserRepository using Prisma.
 * Maps Prisma model objects to domain DTOs before returning them.
 */
import type { PrismaClient } from '@prisma/client';
import type { IUserRepository, UserDto, CreateUserDto, UpdateUserDto } from '../../domain/interfaces/IUserRepository';
export declare class PrismaUserRepository implements IUserRepository {
    private readonly db;
    constructor(db: PrismaClient);
    findAll(): Promise<UserDto[]>;
    findById(id: string): Promise<UserDto | null>;
    findByEmail(email: string): Promise<UserDto | null>;
    findByProvider(provider: UserDto['provider'], providerId: string): Promise<UserDto | null>;
    create(data: CreateUserDto): Promise<UserDto>;
    update(id: string, data: UpdateUserDto): Promise<UserDto>;
    delete(id: string): Promise<void>;
}
//# sourceMappingURL=PrismaUserRepository.d.ts.map