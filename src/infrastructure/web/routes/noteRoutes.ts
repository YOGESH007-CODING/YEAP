import { Router } from 'express';
import { authValidation } from '../middleware/authValidation';
import { NoteController } from '../controllers/NoteController';
const router = Router();
router.use(authValidation);
router.patch('/:problemId', (req, res) => { void NoteController.save(req, res); });
router.get('/important', (req, res) => { void NoteController.important(req, res); });
export default router;
