import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authValidation } from '../middleware/authValidation';
import { authRateLimit } from '../middleware/authRateLimit';
import { csrfProtection } from '../middleware/csrfProtection';
import { accountDeletionRateLimit } from '../middleware/accountDeletionRateLimit';
import { emailVerificationRateLimit } from '../middleware/emailVerificationRateLimit';

const router = Router();

const handle = (fn: (req: import('express').Request, res: import('express').Response) => void | Promise<void>) =>
  (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => { Promise.resolve(fn(req, res)).catch(next); };

router.post('/register', authRateLimit, handle(AuthController.register));
router.post('/verify-email', authRateLimit, emailVerificationRateLimit, handle(AuthController.verifyEmail));
router.post('/resend-verification', authRateLimit, emailVerificationRateLimit, handle(AuthController.resendVerificationCode));
router.post('/login', authRateLimit, handle(AuthController.login));
router.get('/google', authRateLimit, handle(AuthController.oauthStart('google')));
router.get('/google/callback', authRateLimit, handle(AuthController.oauthCallback('google')));
router.get('/github', authRateLimit, handle(AuthController.oauthStart('github')));
router.get('/github/callback', authRateLimit, handle(AuthController.oauthCallback('github')));
router.post('/refresh', authRateLimit, handle(AuthController.refresh));
router.post('/logout', handle(AuthController.logout));
router.patch('/profile', authValidation, handle(AuthController.updateProfile));
router.post('/delete-account/reauth', authValidation, csrfProtection, accountDeletionRateLimit, handle(AuthController.beginAccountDeletionReauth));
router.delete('/delete-account', authValidation, csrfProtection, accountDeletionRateLimit, handle(AuthController.deleteAccount));

export default router;
