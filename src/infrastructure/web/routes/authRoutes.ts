import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authValidation } from '../middleware/authValidation';
import { authRateLimit } from '../middleware/authRateLimit';

const router = Router();

const handle = (fn: (req: import('express').Request, res: import('express').Response) => Promise<void>) =>
  (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => { void fn(req, res).catch(next); };

router.post('/register', authRateLimit, handle(AuthController.register));
router.post('/login', authRateLimit, handle(AuthController.login));
router.post('/google', authRateLimit, handle(AuthController.google));
router.post('/refresh', authRateLimit, handle(AuthController.refresh));
router.post('/logout', handle(AuthController.logout));
router.patch('/profile', authValidation, handle(AuthController.updateProfile));

export default router;
