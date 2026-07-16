"use strict";
/**
 * src/infrastructure/external/SendGridNotification.ts
 *
 * Alternative INotificationProvider implementation using SendGrid email delivery.
 * Sends richly formatted HTML daily review bundles via transactional email.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendGridNotificationProvider = void 0;
const logger_1 = require("../../shared/utils/logger");
// ─── Provider ─────────────────────────────────────────────────────────────────
class SendGridNotificationProvider {
    constructor(apiKey, fromEmail) {
        const key = apiKey ?? process.env['SENDGRID_API_KEY'];
        if (!key) {
            throw new Error('SENDGRID_API_KEY is required for SendGridNotificationProvider');
        }
        this.apiKey = key;
        this.fromEmail = fromEmail ?? process.env['SENDGRID_FROM_EMAIL'] ?? 'noreply@yeap.dev';
    }
    async sendDailyBundle(bundle, target) {
        try {
            const htmlContent = this.buildEmailHtml(bundle);
            const subject = `🌅 YEAP: ${bundle.reviewItems.length} reviews ready for you`;
            const payload = {
                personalizations: [{ to: [{ email: target }] }],
                from: { email: this.fromEmail, name: 'YEAP SRS' },
                subject,
                content: [{ type: 'text/html', value: htmlContent }],
            };
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (response.status === 202) {
                const messageId = response.headers.get('x-message-id') ?? 'unknown';
                logger_1.logger.info(`[SendGrid] Email sent to ${target}, messageId: ${messageId}`);
                return { success: true, messageId };
            }
            else {
                const body = await response.text();
                logger_1.logger.error(`[SendGrid] Failed with status ${response.status}: ${body}`);
                return { success: false, error: `HTTP ${response.status}: ${body}` };
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger_1.logger.error(`[SendGrid] Send failed: ${message}`);
            return { success: false, error: message };
        }
    }
    // ─── HTML Email Builder ───────────────────────────────────────────────────
    buildEmailHtml(bundle) {
        const diffBadge = (d) => {
            const color = d === 'EASY' ? '#00b8a3' : d === 'MEDIUM' ? '#ffa116' : '#ff375f';
            return `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">${d}</span>`;
        };
        const getRows = (items) => items
            .map((item) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #2d2d2d;">
            <a href="https://leetcode.com/problems/${item.problemSlug}/"
               style="color:#ffa116;font-weight:600;text-decoration:none;">
              ${item.problemTitle}
            </a>
          </td>
          <td style="padding:12px;border-bottom:1px solid #2d2d2d;text-align:center;">
            ${diffBadge(item.difficulty)}
          </td>
          <td style="padding:12px;border-bottom:1px solid #2d2d2d;text-align:center;color:#a8a8a8;">
            ${item.easinessFactor.toFixed(2)}
          </td>
          <td style="padding:12px;border-bottom:1px solid #2d2d2d;text-align:center;color:#a8a8a8;">
            ${item.intervalDays}d
          </td>
        </tr>`)
            .join('');
        const standardItems = bundle.reviewItems.filter((item) => !item.isNewChallenge);
        const bonusItems = bundle.reviewItems.filter((item) => item.isNewChallenge);
        const summaryLine = `You have <strong style="color:#ffa116">${bundle.reviewItems.length} problems</strong> due today (${bundle.totalDue} total in backlog).`;
        const criticalLine = bundle.criticalCount > 0
            ? `<br>⚠️ <strong style="color:#ff375f">${bundle.criticalCount} critical items</strong> with low EF — tackle these first.`
            : '';
        const standardSection = standardItems.length > 0
            ? `
            <h2 style="color:#fff;font-size:16px;margin-top:24px;margin-bottom:8px;">📚 Today's Reviews</h2>
            <table style="width:100%;border-collapse:collapse;margin-top:8px;">
              <thead>
                <tr style="background:#0f3460;">
                  <th style="padding:10px;text-align:left;color:#a8a8a8;font-size:12px;">PROBLEM</th>
                  <th style="padding:10px;text-align:center;color:#a8a8a8;font-size:12px;">DIFFICULTY</th>
                  <th style="padding:10px;text-align:center;color:#a8a8a8;font-size:12px;">EF</th>
                  <th style="padding:10px;text-align:center;color:#a8a8a8;font-size:12px;">INTERVAL</th>
                </tr>
              </thead>
              <tbody>${getRows(standardItems)}</tbody>
            </table>`
            : '';
        const bonusSection = bonusItems.length > 0
            ? `
            <h2 style="color:#fff;font-size:16px;margin-top:24px;margin-bottom:8px;">🌟 Bonus FAANG Challenges</h2>
            <table style="width:100%;border-collapse:collapse;margin-top:8px;">
              <thead>
                <tr style="background:#0f3460;">
                  <th style="padding:10px;text-align:left;color:#a8a8a8;font-size:12px;">PROBLEM</th>
                  <th style="padding:10px;text-align:center;color:#a8a8a8;font-size:12px;">DIFFICULTY</th>
                  <th style="padding:10px;text-align:center;color:#a8a8a8;font-size:12px;">EF</th>
                  <th style="padding:10px;text-align:center;color:#a8a8a8;font-size:12px;">INTERVAL</th>
                </tr>
              </thead>
              <tbody>${getRows(bonusItems)}</tbody>
            </table>`
            : '';
        return `
      <!DOCTYPE html>
      <html>
      <body style="background:#1a1a2e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:20px;">
        <div style="max-width:600px;margin:0 auto;background:#16213e;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#ffa116,#ff6b35);padding:24px;">
            <h1 style="margin:0;color:#fff;font-size:22px;">🌅 YEAP Morning Review</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);">Good morning, ${bundle.recipientName}!</p>
          </div>
          <div style="padding:24px;">
            <p style="color:#e0e0e0;">
              ${summaryLine}${criticalLine}
            </p>
            ${standardSection}
            ${bonusSection}
          </div>
          <div style="padding:16px 24px;background:#0f3460;text-align:center;">
            <p style="margin:0;color:#666;font-size:12px;">YEAP — Your Early AM Practice</p>
          </div>
        </div>
      </body>
      </html>`;
    }
}
exports.SendGridNotificationProvider = SendGridNotificationProvider;
//# sourceMappingURL=SendGridNotification.js.map