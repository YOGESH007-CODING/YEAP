"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const authValidation_1 = require("../middleware/authValidation");
const authRateLimit_1 = require("../middleware/authRateLimit");
const router = (0, express_1.Router)();
const handle = (fn) => (req, res, next) => { void fn(req, res).catch(next); };
router.post('/register', authRateLimit_1.authRateLimit, handle(AuthController_1.AuthController.register));
router.post('/login', authRateLimit_1.authRateLimit, handle(AuthController_1.AuthController.login));
router.post('/google', authRateLimit_1.authRateLimit, handle(AuthController_1.AuthController.google));
router.post('/refresh', authRateLimit_1.authRateLimit, handle(AuthController_1.AuthController.refresh));
router.post('/logout', handle(AuthController_1.AuthController.logout));
router.patch('/profile', authValidation_1.authValidation, handle(AuthController_1.AuthController.updateProfile));
exports.default = router;
//# sourceMappingURL=authRoutes.js.map