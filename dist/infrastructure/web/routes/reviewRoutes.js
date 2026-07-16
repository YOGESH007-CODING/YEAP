"use strict";
/**
 * src/infrastructure/web/routes/reviewRoutes.ts
 *
 * Defines all routes under /api/review and binds them to controller methods.
 * Auth middleware is applied at the router level — all review endpoints are protected.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authValidation_1 = require("../middleware/authValidation");
const ReviewController_1 = require("../controllers/ReviewController");
const router = (0, express_1.Router)();
// Apply auth validation to all routes in this router
router.use(authValidation_1.authValidation);
/**
 * POST /api/review/submit
 * Submit a completed review with a quality score.
 * Body: { problemId: string, qualityScore: 0-5 }
 */
router.post('/submit', (req, res) => {
    void ReviewController_1.ReviewController.submit(req, res);
});
/**
 * POST /api/review/track
 * Initialize a problem in the user's tracking queue.
 * Body: { problemId: string }
 */
router.post('/track', (req, res) => {
    void ReviewController_1.ReviewController.track(req, res);
});
/**
 * GET /api/review/due
 * Get all due problems for the authenticated user.
 */
router.get('/due', (req, res) => {
    void ReviewController_1.ReviewController.getDue(req, res);
});
/**
 * POST /api/review/sync
 * Auto-detect today's LeetCode accepted submissions and track new problems.
 * Returns newly tracked, already tracked, and pending quality score problems.
 */
router.post('/sync', (req, res) => {
    void ReviewController_1.ReviewController.sync(req, res);
});
/**
 * POST /api/review/report
 * Self-report flow: report a problem completion with a quality score.
 * Body: { problemSlug: string, qualityScore: 0-5 }
 * Zero external API calls — all local DB queries.
 */
router.post('/report', (req, res) => {
    void ReviewController_1.ReviewController.report(req, res);
});
/**
 * GET /api/review/history
 * Returns all tracked problems for the authenticated user.
 * Filtering and sorting are handled client-side.
 */
router.get('/history', (req, res) => {
    void ReviewController_1.ReviewController.getHistory(req, res);
});
exports.default = router;
//# sourceMappingURL=reviewRoutes.js.map