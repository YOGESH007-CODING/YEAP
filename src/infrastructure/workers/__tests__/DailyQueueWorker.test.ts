/**
 * src/infrastructure/workers/__tests__/DailyQueueWorker.test.ts
 */

import { createDailyQueueWorker, closeWorker } from '../DailyQueueWorker';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  }));
});

jest.mock('bullmq', () => {
  return {
    Worker: jest.fn().mockImplementation((_queueName, processor) => {
      return {
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
        runProcessor: processor,
      };
    }),
  };
});

jest.mock('../../external/ResendNotificationProvider', () => {
  return {
    ResendNotificationProvider: jest.fn().mockImplementation(() => ({
      sendDailyBundle: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_123' }),
    })),
  };
});

describe('DailyQueueWorker', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      REDIS_URL: 'redis://localhost:6379',
      RESEND_API_KEY: 're_test_key',
    };
  });

  afterEach(async () => {
    await closeWorker();
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('creates worker instance without throwing', () => {
    const worker = createDailyQueueWorker();
    expect(worker).toBeDefined();
  });
});
