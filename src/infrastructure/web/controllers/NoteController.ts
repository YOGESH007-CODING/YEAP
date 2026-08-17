import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prismaClient';

const NoteSchema = z.object({ noteText: z.string().trim().min(1).max(10_000), importantFlag: z.boolean().optional() });

export const NoteController = {
  async save(req: Request, res: Response): Promise<void> {
    const input = NoteSchema.safeParse(req.body);
    if (!input.success) { res.status(400).json({ success: false, error: 'A note between 1 and 10,000 characters is required.' }); return; }
    const problem = await prisma.problem.findUnique({ where: { id: req.params['problemId'] } });
    if (!problem) { res.status(404).json({ success: false, error: 'Problem not found.' }); return; }
    const note = await prisma.userNote.upsert({
      where: { userId_problemId: { userId: req.userId!, problemId: problem.id } },
      create: { userId: req.userId!, problemId: problem.id, ...input.data },
      update: { ...input.data },
    });
    res.json({ success: true, data: { note } });
  },
  async important(req: Request, res: Response): Promise<void> {
    const notes = await prisma.userNote.findMany({ where: { userId: req.userId!, importantFlag: true }, include: { problem: { select: { id: true, slug: true, title: true } } }, orderBy: { updatedAt: 'desc' } });
    res.json({ success: true, data: { notes } });
  },
};
