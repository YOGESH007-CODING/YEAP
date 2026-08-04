import { createHash, randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request { requestId?: string; }
  }
}

export const requestContext = (req: Request, _res: Response, next: NextFunction): void => {
  const supplied = req.header('x-request-id');
  req.requestId = supplied && /^[A-Za-z0-9_-]{8,128}$/.test(supplied) ? supplied : randomUUID();
  next();
};

export const clientIpHash = (req: Request): string =>
  createHash('sha256').update(`${process.env['AUDIT_IP_SALT'] ?? process.env['JWT_SECRET'] ?? 'missing'}:${req.ip ?? 'unknown'}`).digest('hex');
