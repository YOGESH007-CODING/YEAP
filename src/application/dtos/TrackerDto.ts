import { z } from 'zod';

export const CreateTrackerDto = z.object({
  companyName: z.string().trim().min(1).max(100),
  dailySolveGoal: z.number().int().min(1).max(50).optional(),
  dailyRevisionGoal: z.number().int().min(1).max(100).optional(),
  weeklySolveGoal: z.number().int().min(1).max(350).optional(),
}).strict();

export const UpdateTrackerDto = z.object({
  isActive: z.boolean().optional(),
  dailySolveGoal: z.number().int().min(1).max(50).optional(),
  dailyRevisionGoal: z.number().int().min(1).max(100).optional(),
  weeklySolveGoal: z.number().int().min(1).max(350).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');
