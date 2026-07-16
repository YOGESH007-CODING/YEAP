"use strict";
/**
 * src/infrastructure/web/routes/problemRoutes.ts
 *
 * Defines all routes under /api/problems.
 * Auth middleware is applied at the router level.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authValidation_1 = require("../middleware/authValidation");
const ReviewController_1 = require("../controllers/ReviewController");
const router = (0, express_1.Router)();
// Apply auth validation to all routes in this router
router.use(authValidation_1.authValidation);
/**
 * GET /api/problems/search?q=two-sum&limit=10
 * Search problems by title or slug for autocomplete.
 * Returns up to 25 results (default 10).
 */
router.get('/search', (req, res) => {
    void ReviewController_1.ReviewController.searchProblems(req, res);
});
router.get('/:slug', (req, res) => { void ReviewController_1.ReviewController.getProblem(req, res); });
exports.default = router;
//# sourceMappingURL=problemRoutes.js.map