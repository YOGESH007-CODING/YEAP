/**
 * src/domain/interfaces/IUserRepository.ts
 *
 * Contract for all user persistence operations.
 * Infrastructure implementations must satisfy this interface.
 */

export interface UserDto {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  provider: 'LOCAL' | 'GOOGLE' | 'GITHUB';
  providerId: string | null;
  leetcodeUsername: string | null;
  telegramChatId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  name?: string;
  passwordHash?: string;
  provider?: 'LOCAL' | 'GOOGLE' | 'GITHUB';
  providerId?: string;
  leetcodeUsername?: string;
  telegramChatId?: string;
}

export interface UpdateUserDto {
  name?: string;
  leetcodeUsername?: string;
  telegramChatId?: string;
}

export interface IUserRepository {
  findAll(): Promise<UserDto[]>;
  /**
   * Returns only non-soft-deleted users (deletedAt IS NULL). The daily worker
   * must use this so it doesn't fan out queries and notifications for deleted
   * accounts. `findAll()` is retained for admin/auth paths that need everyone.
   */
  findActive(): Promise<UserDto[]>;
  findById(id: string): Promise<UserDto | null>;
  findByEmail(email: string): Promise<UserDto | null>;
  findByProvider(provider: UserDto['provider'], providerId: string): Promise<UserDto | null>;
  create(data: CreateUserDto): Promise<UserDto>;
  update(id: string, data: UpdateUserDto): Promise<UserDto>;
  delete(id: string): Promise<void>;
}
