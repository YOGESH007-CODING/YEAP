import { Router } from 'express';
import { authValidation } from '../middleware/authValidation';
import { StreakController } from '../controllers/StreakController';
const router = Router();
router.use(authValidation);
router.get('/', (req, res) => { void StreakController.get(req, res); });
export default router;
