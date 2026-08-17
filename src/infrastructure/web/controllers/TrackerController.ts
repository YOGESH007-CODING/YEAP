import type { Request, Response } from 'express';
import { CreateTrackerDto, UpdateTrackerDto } from '../../../application/dtos/TrackerDto';
import { prisma } from '../../database/prismaClient';
import { calculateMasteryScore } from '../../../application/use-cases/MemoryLayerService';

const SUPPORTED_COMPANIES = ['Amazon', 'Apple', 'Google', 'Meta', 'Microsoft', 'Netflix'] as const;
const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const percentage = (part: number, total: number): number => total === 0 ? 0 : Math.round((part / total) * 100);

const normalizeCompany = (name: string): string | undefined =>
  SUPPORTED_COMPANIES.find((company) => company.toLowerCase() === name.trim().toLowerCase());

const trackerSummary = async (userId: string, tracker: {
  id: string; companyName: string; dailySolveGoal: number; dailyRevisionGoal: number;
  weeklySolveGoal: number; isActive: boolean; lastActivityAt: Date;
}) => {
  const now = new Date();
  const today = startOfDay(now);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  const problems = await prisma.problem.findMany({
    where: { companyTags: { has: tracker.companyName } },
    select: {
      id: true,
      topicTags: true,
      progresses: {
        where: { userId },
        select: { createdAt: true, lastReviewedAt: true },
      },
    },
  });

  let solved = 0;
  let dailySolved = 0;
  let dailyRevisions = 0;
  let weeklySolved = 0;
  const topics = new Map<string, { total: number; solved: number }>();
  for (const problem of problems) {
    const progress = problem.progresses[0];
    const isSolved = Boolean(progress);
    if (isSolved) solved++;
    if (progress?.createdAt >= today) dailySolved++;
    if (progress?.createdAt >= weekStart) weeklySolved++;
    if (progress?.lastReviewedAt && progress.lastReviewedAt >= today) dailyRevisions++;
    for (const topic of problem.topicTags) {
      const item = topics.get(topic) ?? { total: 0, solved: 0 };
      item.total++;
      if (isSolved) item.solved++;
      topics.set(topic, item);
    }
  }
  const total = problems.length;
  const completionPercentage = percentage(solved, total);
  const readinessPercentage = Math.round((completionPercentage + Math.min(100, percentage(dailySolved, tracker.dailySolveGoal)) + Math.min(100, percentage(dailyRevisions, tracker.dailyRevisionGoal)) + Math.min(100, percentage(weeklySolved, tracker.weeklySolveGoal))) / 4);

  return {
    ...tracker,
    totalQuestions: total,
    solvedQuestions: solved,
    remainingQuestions: total - solved,
    completionPercentage,
    readinessPercentage,
    daily: { solved: dailySolved, solveGoal: tracker.dailySolveGoal, revisions: dailyRevisions, revisionGoal: tracker.dailyRevisionGoal },
    weekly: { solved: weeklySolved, solveGoal: tracker.weeklySolveGoal },
    topics: [...topics.entries()]
      .map(([name, value]) => ({ name, ...value, completionPercentage: percentage(value.solved, value.total) }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
  };
};

export const TrackerController = {
  async supportedCompanies(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: { companies: SUPPORTED_COMPANIES } });
  },

  async heatmap(req: Request, res: Response): Promise<void> {
    const topics = (await prisma.userTopicMastery.findMany({ where: { userId: req.userId! } }))
      .map((topic) => ({ ...topic, masteryScore: calculateMasteryScore(topic.totalAttempts, topic.correctAttempts, topic.mistakeCount, topic.lastPracticedAt) }))
      .sort((a, b) => a.masteryScore - b.masteryScore);
    res.json({ success: true, data: { topics } });
  },

  async readiness(req: Request, res: Response): Promise<void> {
    const tracker = await prisma.companyTracker.findFirst({ where: { id: req.params['trackerId'], userId: req.userId! } });
    if (!tracker) { res.status(404).json({ success: false, error: 'Tracker not found.' }); return; }
    const now = new Date();
    const problems = await prisma.problem.findMany({ where: { companyTags: { has: tracker.companyName } }, select: { id: true, difficulty: true, topicTags: true, progresses: { where: { userId: req.userId! }, select: { dueDate: true } } } });
    const solved = problems.filter((p) => p.progresses.length > 0);
    const coverage = problems.length ? solved.length / problems.length : 0;
    const topicCounts = new Map<string, number>();
    problems.forEach((p) => p.topicTags.forEach((t) => topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1)));
    const masteries = await prisma.userTopicMastery.findMany({ where: { userId: req.userId!, topicName: { in: [...topicCounts.keys()] } } });
    const masteryMap = new Map(masteries.map((m) => [m.topicName, m.masteryScore]));
    const totalAttempts = masteries.reduce((sum, m) => sum + m.totalAttempts, 0);
    const topicStrength = totalAttempts < 10 ? coverage : [...topicCounts.entries()].reduce((sum, [topic, count]) => sum + count * ((masteryMap.get(topic) ?? 50) / 100), 0) / Math.max(1, problems.reduce((sum, p) => sum + p.topicTags.length, 0));
    const freshnessPenalty = solved.length ? -0.15 * (solved.filter((p) => p.progresses[0].dueDate < now).length / solved.length) : 0;
    const companyHardRatio = problems.length ? problems.filter((p) => p.difficulty === 'HARD').length / problems.length : 0;
    const userHardRatio = solved.length ? solved.filter((p) => p.difficulty === 'HARD').length / solved.length : 0;
    const difficultyAlignment = Math.max(0, 1 - Math.abs(userHardRatio - companyHardRatio));
    const score = Math.round(Math.max(0, Math.min(100, 100 * (.35 * coverage + .35 * topicStrength + .20 * difficultyAlignment + freshnessPenalty))));
    const weakestTopics = [...topicCounts.keys()].sort((a, b) => (masteryMap.get(a) ?? 50) - (masteryMap.get(b) ?? 50)).slice(0, 5);
    res.json({ success: true, data: { score, earlyEstimate: totalAttempts < 10, breakdown: { coverage, topicStrength, freshnessPenalty, difficultyAlignment }, weakestTopics } });
  },

  async list(req: Request, res: Response): Promise<void> {
    const trackers = await prisma.companyTracker.findMany({
      where: { userId: req.userId! },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
    const data = await Promise.all(trackers.map((tracker) => trackerSummary(req.userId!, tracker)));
    res.json({ success: true, data: { trackers: data } });
  },

  async create(req: Request, res: Response): Promise<void> {
    const input = CreateTrackerDto.safeParse(req.body);
    if (!input.success) { res.status(400).json({ success: false, error: 'Invalid tracker details.' }); return; }
    const companyName = normalizeCompany(input.data.companyName);
    if (!companyName) { res.status(400).json({ success: false, error: 'Unsupported company.' }); return; }
    try {
      const tracker = await prisma.companyTracker.create({
        data: { userId: req.userId!, companyName, dailySolveGoal: input.data.dailySolveGoal, dailyRevisionGoal: input.data.dailyRevisionGoal, weeklySolveGoal: input.data.weeklySolveGoal },
      });
      res.status(201).json({ success: true, data: { tracker: await trackerSummary(req.userId!, tracker) } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') { res.status(409).json({ success: false, error: 'You already have a tracker for this company.' }); return; }
      throw error;
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    const input = UpdateTrackerDto.safeParse(req.body);
    if (!input.success) { res.status(400).json({ success: false, error: 'Invalid tracker details.' }); return; }
    const updated = await prisma.companyTracker.updateMany({
      where: { id: req.params['trackerId'], userId: req.userId! },
      data: { ...input.data, lastActivityAt: new Date() },
    });
    if (updated.count === 0) { res.status(404).json({ success: false, error: 'Tracker not found.' }); return; }
    const tracker = await prisma.companyTracker.findUniqueOrThrow({ where: { id: req.params['trackerId'] } });
    res.json({ success: true, data: { tracker: await trackerSummary(req.userId!, tracker) } });
  },
};
