import type { NextFunction, Request, Response } from 'express';

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;

export const authRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  const key = req.ip ?? 'unknown';
  const now = Date.now();
  const current = attempts.get(key);
  const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : current;
  entry.count += 1;
  attempts.set(key, entry);
  if (entry.count > MAX_ATTEMPTS) {
    res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
    res.status(429).json({ success: false, error: 'Too many authentication attempts. Try again later.' });
    return;
  }
  next();
};
