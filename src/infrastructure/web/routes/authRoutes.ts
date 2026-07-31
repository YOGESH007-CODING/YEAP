import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authValidation } from '../middleware/authValidation';
import { authRateLimit } from '../middleware/authRateLimit';

const router = Router();

const handle = (fn: (req: import('express').Request, res: import('express').Response) => void | Promise<void>) =>
  (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => { Promise.resolve(fn(req, res)).catch(next); };

router.post('/register', authRateLimit, handle(AuthController.register));
router.post('/login', authRateLimit, handle(AuthController.login));
router.get('/google', authRateLimit, handle(AuthController.oauthStart('google')));
router.get('/google/callback', authRateLimit, handle(AuthController.oauthCallback('google')));
router.get('/github', authRateLimit, handle(AuthController.oauthStart('github')));
router.get('/github/callback', authRateLimit, handle(AuthController.oauthCallback('github')));
router.post('/refresh', authRateLimit, handle(AuthController.refresh));
router.post('/logout', handle(AuthController.logout));
router.patch('/profile', authValidation, handle(AuthController.updateProfile));

export default router;
