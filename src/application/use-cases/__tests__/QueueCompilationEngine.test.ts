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

const makeProgress = (problemId: string) => ({
  id: `progress-${problemId}`,
  userId: 'user-1',
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

describe('QueueCompilationEngine minimum queue seeding', () => {
  it('adds only the missing unseen FAANG problems until the user tracks five', async () => {
    const progressRepo = {
      findAllByUser: jest.fn().mockResolvedValue([makeProgress('existing-1'), makeProgress('existing-2')]),
      findOrCreate: jest.fn().mockResolvedValue(undefined),
      findDueByUser: jest.fn().mockResolvedValue([
        makeProgress('existing-1'),
        makeProgress('existing-2'),
        makeProgress('new-1'),
        makeProgress('new-2'),
        makeProgress('new-3'),
      ]),
    };
    const problemRepo = {
      getUnseenProblems: jest.fn().mockResolvedValue([
        makeProblem('new-1'), makeProblem('new-2'), makeProblem('new-3'),
      ]),
    };
    const userRepo = {
      findAll: jest.fn().mockResolvedValue([{ id: 'user-1' }]),
      findById: jest.fn().mockResolvedValue({ id: 'user-1', email: 'user@example.com', name: 'User' }),
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
    expect(progressRepo.findOrCreate).toHaveBeenCalledTimes(3);
    expect(notificationProvider.sendDailyBundle).toHaveBeenCalledWith(
      expect.objectContaining({ reviewItems: expect.any(Array) }),
      'user@example.com',
    );
  });

  it('does not select new questions for users who already track five', async () => {
    const progressRepo = {
      findAllByUser: jest.fn().mockResolvedValue([1, 2, 3, 4, 5].map((id) => makeProgress(`existing-${id}`))),
      findDueByUser: jest.fn().mockResolvedValue([]),
    };
    const problemRepo = { getUnseenProblems: jest.fn() };
    const userRepo = { findAll: jest.fn().mockResolvedValue([{ id: 'user-1' }]) };

    const engine = new QueueCompilationEngine({
      progressRepository: progressRepo as never,
      problemRepository: problemRepo as never,
      userRepository: userRepo as never,
      notificationProvider: { sendDailyBundle: jest.fn() },
    });

    await engine.execute();

    expect(problemRepo.getUnseenProblems).not.toHaveBeenCalled();
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
      progressRepository: { findAllByUser: jest.fn().mockResolvedValue([weak, strong]), findDueByUser: jest.fn().mockResolvedValue([strong, weak]), findOrCreate: jest.fn() } as never,
      problemRepository: { getUnseenProblems: jest.fn().mockResolvedValue([]) } as never,
      userRepository: { findAll: jest.fn().mockResolvedValue([{ id: 'user-1' }]), findById: jest.fn().mockResolvedValue({ id: 'user-1', email: 'user@example.com' }) } as never,
      notificationProvider,
      masteryLookup: jest.fn().mockResolvedValue(new Map([['Graph', 10], ['Array', 90]])),
    });

    await engine.execute();

    const bundle = notificationProvider.sendDailyBundle.mock.calls[0][0];
    expect(bundle.reviewItems[0].problemSlug).toBe('problem-weak');
  });

  it('does not count new challenges as critical reviews', async () => {
    const notificationProvider = { sendDailyBundle: jest.fn().mockResolvedValue({ success: true }) };
    const engine = new QueueCompilationEngine({
      progressRepository: { findAllByUser: jest.fn().mockResolvedValue([makeProgress('one')]), findDueByUser: jest.fn().mockResolvedValue([makeProgress('one')]), findOrCreate: jest.fn() } as never,
      problemRepository: { getUnseenProblems: jest.fn().mockResolvedValue([makeProblem('bonus-1'), makeProblem('bonus-2'), makeProblem('bonus-3'), makeProblem('bonus-4')]) } as never,
      userRepository: { findAll: jest.fn().mockResolvedValue([{ id: 'user-1' }]), findById: jest.fn().mockResolvedValue({ id: 'user-1', email: 'user@example.com' }) } as never,
      notificationProvider,
    });

    await engine.execute();

    expect(notificationProvider.sendDailyBundle.mock.calls[0][0].criticalCount).toBe(0);
  });
});
