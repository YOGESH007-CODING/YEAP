/**
 * src/infrastructure/external/ResendNotificationProvider.ts
 *
 * INotificationProvider implementation using Resend for email delivery.
 * Sends richly formatted HTML daily review bundles.
 */

import { Resend } from 'resend';
import type {
  INotificationProvider,
  DailyBundle,
  NotificationResult,
  ReviewItem,
} from '../../domain/interfaces/INotificationProvider';
import { logger } from '../../shared/utils/logger';

export class ResendNotificationProvider implements INotificationProvider {
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(apiKey?: string, fromEmail?: string) {
    const key = apiKey ?? process.env['RESEND_API_KEY'];
    if (!key) {
      throw new Error('RESEND_API_KEY is required for ResendNotificationProvider');
    }
    this.resend = new Resend(key);
    this.fromEmail = fromEmail ?? process.env['NOTIFICATION_FROM_EMAIL'] ?? 'noreply@yeap.dev';
  }

  async sendDailyBundle(
    bundle: DailyBundle,
    target: string, // Target email address
  ): Promise<NotificationResult> {
    try {
      const html = this.buildEmailHtml(bundle);
      const subject = `🌅 YEAP: ${bundle.reviewItems.length} reviews ready for you`;

      logger.info(`[Resend] Attempting to send email to ${target} for userId=${bundle.userId}`);

      const sendPromise = this.resend.emails.send({
        from: `YEAP SRS <${this.fromEmail}>`,
        to: [target],
        subject,
        html,
      });

      // 10s timeout — don't let a hung Resend call block the daily worker
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Resend email send timed out after 10s')), 10_000),
      );

      const { data, error } = await Promise.race([sendPromise, timeoutPromise]);

      if (error) {
        throw new Error(error.message);
      }

      const messageId = data?.id ?? 'unknown';
      logger.info(`[Resend] Email sent to ${target}, messageId: ${messageId}`);

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[Resend] Send failed for userId=${bundle.userId}: ${message}`);
      throw error;
    }
  }

  private buildEmailHtml(bundle: DailyBundle): string {
    const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
    const diffBadge = (d: string) => {
      const color = d === 'EASY' ? '#00b8a3' : d === 'MEDIUM' ? '#ffa116' : '#ff375f';
      return `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">${d}</span>`;
    };

    const getRows = (items: ReviewItem[]) =>
      items
        .map(
          (item) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #2d2d2d;">
            <a href="https://leetcode.com/problems/${item.problemSlug}/"
               style="color:#ffa116;font-weight:600;text-decoration:none;">
              ${escapeHtml(item.problemTitle)}
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
        </tr>`,
        )
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
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);">Good morning, ${escapeHtml(bundle.recipientName)}!</p>
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
