import type { NextFunction, Request, Response } from 'express';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts) if (entry.resetAt <= now) attempts.delete(key);
}, WINDOW_MS);
cleanupTimer.unref();

/** Limits verification guesses by the combination of client IP and email. */
export const emailVerificationRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'invalid';
  const key = `${req.ip ?? 'unknown'}:${email}`;
  const now = Date.now();
  const current = attempts.get(key);
  const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : current;
  entry.count += 1;
  attempts.set(key, entry);
  if (entry.count > MAX_ATTEMPTS) {
    res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
    res.status(429).json({ success: false, error: 'Too many verification attempts. Try again later.' });
    return;
  }
  next();
};
