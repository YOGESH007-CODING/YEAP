/**
 * src/infrastructure/web/routes/problemRoutes.ts
 *
 * Defines all routes under /api/problems.
 * Auth middleware is applied at the router level.
 */

import { Router } from 'express';
import { authValidation } from '../middleware/authValidation';
import { ReviewController } from '../controllers/ReviewController';

const router = Router();

// Apply auth validation to all routes in this router
router.use(authValidation);

/**
 * GET /api/problems/search?q=two-sum&limit=10
 * Search problems by title or slug for autocomplete.
 * Returns up to 25 results (default 10).
 */
router.get('/search', (req, res) => {
  void ReviewController.searchProblems(req, res);
});
router.get('/:slug', (req, res) => { void ReviewController.getProblem(req, res); });

export default router;
