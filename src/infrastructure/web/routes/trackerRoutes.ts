import { Router } from 'express';
import { TrackerController } from '../controllers/TrackerController';
import { authValidation } from '../middleware/authValidation';

const router = Router();
router.use(authValidation);
const handle = (fn: (req: import('express').Request, res: import('express').Response) => Promise<void>) =>
  (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => { void fn(req, res).catch(next); };

router.get('/companies', handle(TrackerController.supportedCompanies));
router.get('/', handle(TrackerController.list));
router.post('/', handle(TrackerController.create));
router.patch('/:trackerId', handle(TrackerController.update));

export default router;
