import { QueueCompilationEngine } from '../QueueCompilationEngine';

const now = new Date('2026-07-31T04:00:00.000Z');

const makeProblem = (id: string) => ({
  id,
  slug: `problem-${id}`,
  title: `Problem ${id}`,
  difficulty: 'EASY' as const,
  topicTags: ['Array'],
  companyTags: ['Google'],
  createdAt: now,
  updatedAt: now,
});

const makeProgress = (problemId: string, userId = 'user-1') => ({
  id: `progress-${problemId}`,
  userId,
  problemId,
  repetitions: 0,
  easinessFactor: 2.5,
  intervalDays: 1,
  dueDate: now,
  lastReviewedAt: null,
  createdAt: now,
  updatedAt: now,
  problem: makeProblem(problemId),
});

const makeUser = (id: string) => ({
  id,
  email: id === 'user-1' ? 'user@example.com' : `${id}@example.com`,
  name: 'User',
});

/**
 * The engine reads in batches, so every mock repository needs the run-level
 * queries: one grouped tracked-count, one ranked due query, one grouped due-count.
 */
const makeProgressRepo = (overrides: Record<string, unknown> = {}) => ({
  countGroupedByUser: jest.fn().mockResolvedValue(new Map()),
  countDueGroupedByUser: jest.fn().mockResolvedValue(new Map()),
  createManyForUser: jest.fn().mockResolvedValue(0),
  findAllDue: jest.fn().mockResolvedValue([]),
  ...overrides,
});

describe('QueueCompilationEngine minimum queue seeding', () => {
  it('adds only the missing unseen FAANG problems until the user tracks five', async () => {
    const progressRepo = makeProgressRepo({
      countGroupedByUser: jest.fn().mockResolvedValue(new Map([['user-1', 2]])),
      countDueGroupedByUser: jest.fn().mockResolvedValue(new Map([['user-1', 5]])),
      createManyForUser: jest.fn().mockResolvedValue(3),
      findAllDue: jest.fn().mockResolvedValue([
        makeProgress('existing-1'),
        makeProgress('existing-2'),
        makeProgress('new-1'),
        makeProgress('new-2'),
        makeProgress('new-3'),
      ]),
    });
    const problemRepo = {
      getUnseenProblems: jest.fn().mockResolvedValue([
        makeProblem('new-1'), makeProblem('new-2'), makeProblem('new-3'),
      ]),
    };
    const userRepo = {
      findActive: jest.fn().mockResolvedValue([makeUser('user-1')]),
      findById: jest.fn(),
    };
    const notificationProvider = { sendDailyBundle: jest.fn().mockResolvedValue({ success: true }) };

    const engine = new QueueCompilationEngine({
      progressRepository: progressRepo as never,
      problemRepository: problemRepo as never,
      userRepository: userRepo as never,
      notificationProvider,
    });

    await engine.execute();

    expect(problemRepo.getUnseenProblems).toHaveBeenCalledWith(
      'user-1', 3, ['Amazon', 'Google', 'Meta', 'Microsoft', 'Apple'],
    );
    // One bulk insert replaces the previous three sequential findOrCreate calls.
    expect(progressRepo.createManyForUser).toHaveBeenCalledTimes(1);
    expect(progressRepo.createManyForUser).toHaveBeenCalledWith('user-1', ['new-1', 'new-2', 'new-3']);
    expect(notificationProvider.sendDailyBundle).toHaveBeenCalledWith(
      expect.objectContaining({ reviewItems: expect.any(Array) }),
      'user@example.com',
    );
  });

  it('does not select new questions for users who already track five', async () => {
    const progressRepo = makeProgressRepo({
      countGroupedByUser: jest.fn().mockResolvedValue(new Map([['user-1', 5]])),
    });
    const problemRepo = { getUnseenProblems: jest.fn() };
    const userRepo = { findActive: jest.fn().mockResolvedValue([makeUser('user-1')]) };

    const engine = new QueueCompilationEngine({
      progressRepository: progressRepo as never,
      problemRepository: problemRepo as never,
      userRepository: userRepo as never,
      notificationProvider: { sendDailyBundle: jest.fn() },
    });

    await engine.execute();

    expect(problemRepo.getUnseenProblems).not.toHaveBeenCalled();
    expect(progressRepo.createManyForUser).not.toHaveBeenCalled();
  });
});

describe('QueueCompilationEngine batching', () => {
  it('reads the due backlog once for the whole run instead of once per user', async () => {
    const progressRepo = makeProgressRepo({
      countGroupedByUser: jest.fn().mockResolvedValue(new Map([['user-1', 5], ['user-2', 5]])),
      countDueGroupedByUser: jest.fn().mockResolvedValue(new Map([['user-1', 1], ['user-2', 1]])),
      findAllDue: jest.fn().mockResolvedValue([
        makeProgress('a', 'user-1'),
        makeProgress('b', 'user-2'),
      ]),
    });
    const userRepo = {
      findActive: jest.fn().mockResolvedValue([makeUser('user-1'), makeUser('user-2')]),
      findById: jest.fn(),
      findAll: jest.fn(),
    };
    const notificationProvider = { sendDailyBundle: jest.fn().mockResolvedValue({ success: true }) };

    const engine = new QueueCompilationEngine({
      progressRepository: progressRepo as never,
      problemRepository: { getUnseenProblems: jest.fn().mockResolvedValue([]) } as never,
      userRepository: userRepo as never,
      notificationProvider,
    });

    const result = await engine.execute();

    expect(progressRepo.findAllDue).toHaveBeenCalledTimes(1);
    expect(progressRepo.countGroupedByUser).toHaveBeenCalledTimes(1);
    expect(progressRepo.countDueGroupedByUser).toHaveBeenCalledTimes(1);
    // Soft-deleted users must never be notified, so the run reads findActive only.
    expect(userRepo.findActive).toHaveBeenCalledTimes(1);
    expect(userRepo.findAll).not.toHaveBeenCalled();
    // The user profile is already loaded — no per-user re-fetch before dispatch.
    expect(userRepo.findById).not.toHaveBeenCalled();
    expect(result.usersProcessed).toBe(2);
  });

  it('reports the exact backlog total even when the loaded rows are capped', async () => {
    const notificationProvider = { sendDailyBundle: jest.fn().mockResolvedValue({ success: true }) };
    const engine = new QueueCompilationEngine({
      progressRepository: makeProgressRepo({
        countGroupedByUser: jest.fn().mockResolvedValue(new Map([['user-1', 40]])),
        countDueGroupedByUser: jest.fn().mockResolvedValue(new Map([['user-1', 37]])),
        findAllDue: jest.fn().mockResolvedValue([makeProgress('one'), makeProgress('two')]),
      }) as never,
      problemRepository: { getUnseenProblems: jest.fn().mockResolvedValue([]) } as never,
      userRepository: { findActive: jest.fn().mockResolvedValue([makeUser('user-1')]) } as never,
      notificationProvider,
    });

    await engine.execute();

    expect(notificationProvider.sendDailyBundle.mock.calls[0][0].totalDue).toBe(37);
  });
});

describe('QueueCompilationEngine priority and critical counts', () => {
  it('promotes the weakest-topic due item ahead of a stronger topic with the same EF', async () => {
    const weak = makeProgress('weak');
    weak.problem.topicTags = ['Graph'];
    const strong = makeProgress('strong');
    strong.problem.topicTags = ['Array'];
    const notificationProvider = { sendDailyBundle: jest.fn().mockResolvedValue({ success: true }) };
    const engine = new QueueCompilationEngine({
      progressRepository: makeProgressRepo({
        countGroupedByUser: jest.fn().mockResolvedValue(new Map([['user-1', 5]])),
        countDueGroupedByUser: jest.fn().mockResolvedValue(new Map([['user-1', 2]])),
        findAllDue: jest.fn().mockResolvedValue([strong, weak]),
      }) as never,
      problemRepository: { getUnseenProblems: jest.fn().mockResolvedValue([]) } as never,
      userRepository: { findActive: jest.fn().mockResolvedValue([makeUser('user-1')]) } as never,
      notificationProvider,
      masteryLookup: jest.fn().mockResolvedValue(
        new Map([['user-1', new Map([['Graph', 10], ['Array', 90]])]]),
      ),
    });

    await engine.execute();

    const bundle = notificationProvider.sendDailyBundle.mock.calls[0][0];
    expect(bundle.reviewItems[0].problemSlug).toBe('problem-weak');
  });

  it('resolves topic mastery once for the entire run', async () => {
    const masteryLookup = jest.fn().mockResolvedValue(new Map());
    const engine = new QueueCompilationEngine({
      progressRepository: makeProgressRepo({
        countGroupedByUser: jest.fn().mockResolvedValue(new Map([['user-1', 5], ['user-2', 5]])),
        countDueGroupedByUser: jest.fn().mockResolvedValue(new Map([['user-1', 1], ['user-2', 1]])),
        findAllDue: jest.fn().mockResolvedValue([
          makeProgress('a', 'user-1'),
          makeProgress('b', 'user-2'),
        ]),
      }) as never,
      problemRepository: { getUnseenProblems: jest.fn().mockResolvedValue([]) } as never,
      userRepository: {
        findActive: jest.fn().mockResolvedValue([makeUser('user-1'), makeUser('user-2')]),
      } as never,
      notificationProvider: { sendDailyBundle: jest.fn().mockResolvedValue({ success: true }) },
      masteryLookup,
    });

    await engine.execute();

    expect(masteryLookup).toHaveBeenCalledTimes(1);
    expect(masteryLookup).toHaveBeenCalledWith([
      { userId: 'user-1', topics: ['Array'] },
      { userId: 'user-2', topics: ['Array'] },
    ]);
  });

  it('does not count new challenges as critical reviews', async () => {
    const notificationProvider = { sendDailyBundle: jest.fn().mockResolvedValue({ success: true }) };
    const engine = new QueueCompilationEngine({
      progressRepository: makeProgressRepo({
        countGroupedByUser: jest.fn().mockResolvedValue(new Map([['user-1', 1]])),
        countDueGroupedByUser: jest.fn().mockResolvedValue(new Map([['user-1', 1]])),
        findAllDue: jest.fn().mockResolvedValue([makeProgress('one')]),
      }) as never,
      problemRepository: {
        getUnseenProblems: jest.fn().mockResolvedValue([
          makeProblem('bonus-1'), makeProblem('bonus-2'), makeProblem('bonus-3'), makeProblem('bonus-4'),
        ]),
      } as never,
      userRepository: { findActive: jest.fn().mockResolvedValue([makeUser('user-1')]) } as never,
      notificationProvider,
    });

    await engine.execute();

    expect(notificationProvider.sendDailyBundle.mock.calls[0][0].criticalCount).toBe(0);
  });
});
