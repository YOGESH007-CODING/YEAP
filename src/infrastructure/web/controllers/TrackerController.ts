import type { Request, Response } from 'express';
import { CreateTrackerDto, UpdateTrackerDto } from '../../../application/dtos/TrackerDto';
import { prisma } from '../../database/prismaClient';

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
