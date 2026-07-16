"use strict";
/**
 * src/app.ts
 *
 * Express application initialization and middleware pipeline.
 * Separated from server.ts to allow easy testing without binding to a port.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const logger_1 = require("./shared/utils/logger");
const reviewRoutes_1 = __importDefault(require("./infrastructure/web/routes/reviewRoutes"));
const problemRoutes_1 = __importDefault(require("./infrastructure/web/routes/problemRoutes"));
const authRoutes_1 = __importDefault(require("./infrastructure/web/routes/authRoutes"));
const helmet_1 = __importDefault(require("helmet"));
// ─── App Factory ──────────────────────────────────────────────────────────────
const createApp = () => {
    const app = (0, express_1.default)();
    // ── Core Middleware ───────────────────────────────────────────────────
    app.use((0, cors_1.default)({
        origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3001'],
        credentials: true,
    }));
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    // ── Request Logging ───────────────────────────────────────────────────
    app.use((req, _res, next) => {
        logger_1.logger.debug(`→ ${req.method} ${req.path}`);
        next();
    });
    // ── Health Check ──────────────────────────────────────────────────────
    app.get('/health', (_req, res) => {
        res.status(200).json({
            status: 'ok',
            service: 'yeap-srs-backend',
            timestamp: new Date().toISOString(),
            version: process.env['npm_package_version'] ?? '1.0.0',
        });
    });
    app.disable('x-powered-by');
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                frameAncestors: ["'none'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
            },
        },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }));
    // ── API Routes ────────────────────────────────────────────────────────
    app.use('/api/auth', authRoutes_1.default);
    app.use('/api/review', reviewRoutes_1.default);
    app.use('/api/problems', problemRoutes_1.default);
    // ── 404 Handler ───────────────────────────────────────────────────────
    app.use((_req, res) => {
        res.status(404).json({
            success: false,
            error: 'Route not found',
        });
    });
    // ── Global Error Handler ──────────────────────────────────────────────
    app.use((error, _req, res, _next) => {
        logger_1.logger.error(`[App] Unhandled error: ${error.message}`, { stack: error.stack });
        res.status(error.status === 400 || error.type === 'entity.parse.failed' ? 400 : 500).json({
            success: false,
            error: 'Internal server error',
        });
    });
    return app;
};
exports.createApp = createApp;
//# sourceMappingURL=app.js.map