/**
 * src/infrastructure/web/middleware/authValidation.ts
 *
 * Validates the application's Bearer access token and attaches
 * the authenticated user's ID to the request context.
 *
 * Access tokens are signed locally by TokenService.
 */
import type { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            userEmail?: string;
        }
    }
}
export declare const authValidation: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=authValidation.d.ts.map