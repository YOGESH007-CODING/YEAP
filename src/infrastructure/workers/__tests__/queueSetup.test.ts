/**
 * src/infrastructure/workers/__tests__/queueSetup.test.ts
 */

import { getRedisConnection, verifyRedisConnection, registerDailyJob, closeQueue } from '../queueSetup';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  }));
});

jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => ({
      upsertJobScheduler: jest.fn().mockResolvedValue({}),
      close: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('queueSetup', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, REDIS_URL: 'redis://localhost:6379' };
  });

  afterEach(async () => {
    await closeQueue();
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('creates and returns a redis connection', () => {
    const conn = getRedisConnection();
    expect(conn).toBeDefined();
  });

  it('verifies active redis connection', async () => {
    const isConnected = await verifyRedisConnection();
    expect(isConnected).toBe(true);
  });

  it('registers daily job schedule', async () => {
    await expect(registerDailyJob()).resolves.not.toThrow();
  });
});
