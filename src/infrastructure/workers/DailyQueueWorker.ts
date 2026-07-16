/*
 * Daily Redis/BullMQ worker is disabled for the Vercel deployment.
 *
 * Vercel Functions are request-based, so this persistent cron/queue worker is
 * intentionally not built or started. Reintroduce it only on a host that runs
 * persistent Node.js worker processes.
 */
