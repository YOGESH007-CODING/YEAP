import type { NextFunction, Request, Response } from 'express';

// Bearer-token requests are not automatically attached by browsers, so they
// are not CSRF-authenticated. This Origin check is defense in depth because a
// refresh cookie is also present in this application.
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.header('origin');
  if (!origin) return next(); // non-browser clients must still supply a bearer token
  const allowed = (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:3001')
    .split(',').map((value) => value.trim()).filter(Boolean);
  if (!allowed.includes(origin)) {
    res.status(403).json({ success: false, error: 'Request could not be processed' });
    return;
  }
  next();
};
