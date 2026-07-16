"use strict";
/**
 * src/shared/utils/logger.ts
 *
 * Application-wide logger using Winston.
 * Provides structured JSON logging in production, colorized output in development.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const { combine, timestamp, colorize, printf, json, errors } = winston_1.default.format;
// ─── Console format (development) ────────────────────────────────────────────
const devFormat = combine(colorize({ all: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), printf(({ level, message, timestamp: ts, stack }) => {
    return stack
        ? `${ts} [${level}] ${message}\n${stack}`
        : `${ts} [${level}] ${message}`;
}));
// ─── JSON format (production) ─────────────────────────────────────────────────
const prodFormat = combine(timestamp(), errors({ stack: true }), json());
// ─── Logger Instance ──────────────────────────────────────────────────────────
const isProd = process.env['NODE_ENV'] === 'production';
exports.logger = winston_1.default.createLogger({
    level: isProd ? 'info' : 'debug',
    format: isProd ? prodFormat : devFormat,
    transports: [
        new winston_1.default.transports.Console(),
        // Add file transport for production if needed:
        // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        // new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
    exitOnError: false,
});
//# sourceMappingURL=logger.js.map