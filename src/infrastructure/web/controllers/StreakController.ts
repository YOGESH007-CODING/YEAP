import type { Request, Response } from 'express';
import { prisma } from '../../database/prismaClient';
import { StreakService } from '../../../application/use-cases/StreakService';

const streaks = new StreakService(prisma);
export const StreakController = {
  async get(req: Request, res: Response): Promise<void> {
    const streak = await streaks.evaluate(req.userId!, false);
    res.json({ success: true, data: streak });
  },
  async evaluateAfterReview(userId: string, reviewedDueProblem: boolean): Promise<void> { await streaks.evaluate(userId, reviewedDueProblem); },
};
