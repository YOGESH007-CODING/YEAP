"use strict";
/**
 * src/infrastructure/external/ResendNotificationProvider.ts
 *
 * INotificationProvider implementation using Resend for email delivery.
 * Sends the daily review bundle as an HTML email styled to match the YEAP web
 * app's "Obsidian Protocol" design language (see frontend/src/index.css).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResendNotificationProvider = void 0;
const resend_1 = require("resend");
const logger_1 = require("../../shared/utils/logger");
/**
 * Design tokens mirrored from the frontend's Obsidian Protocol palette
 * (frontend/src/index.css) and component styles (components/ui/Badge.tsx,
 * Card.tsx, Button.tsx).
 *
 * Translucent values are pre-flattened to solid hex on purpose: `rgba()` and
 * CSS variables are unreliable in Outlook and several mobile clients, so every
 * colour here is the composited result over the dark card surface.
 */
const T = {
    canvas: '#020203', // --canvas-deep
    card: '#050506', // --surface-base (Card.tsx background)
    elevated: '#0A0A0C', // --surface-elevated (table head, panels)
    border: '#1e1e21', // border-white/[0.08] over the dark canvas
    divider: '#141417', // subtler row separator
    textPrimary: '#F3F4F6',
    textSecondary: '#8A8F98',
    textTertiary: '#525866',
    indigo: '#5e6ad2', // --primary-container (Button primary)
    indigoLight: '#bdc2ff', // --primary (links, brand wordmark)
    onIndigo: '#fdfaff', // --on-primary-container
    indigoTint: '#0e0f19', // bg-[#5E6AD2]/10
    indigoEdge: '#202342', // border-[#5E6AD2]/30
    easy: '#4bdcc6', // --secondary
    easyTint: '#0c1a18',
    easyEdge: '#1a4540',
    medium: '#ffb867', // --tertiary
    mediumTint: '#1e170f',
    mediumEdge: '#513b22',
    hard: '#FF375F', // --danger-hard
    hardTint: '#1e0a0e',
    hardEdge: '#511420',
    mono: "'JetBrains Mono','SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace",
    sans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    head: "'Geist','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
};
/** EF below this is flagged critical — mirrors QueueCompilationEngine. */
const CRITICAL_EF_THRESHOLD = 1.8;
class ResendNotificationProvider {
    constructor(apiKey, fromEmail) {
        const key = apiKey ?? process.env['RESEND_API_KEY'];
        if (!key) {
            throw new Error('RESEND_API_KEY is required for ResendNotificationProvider');
        }
        this.resend = new resend_1.Resend(key);
        this.fromEmail = fromEmail ?? process.env['NOTIFICATION_FROM_EMAIL'] ?? 'noreply@yeap.dev';
    }
    async sendDailyBundle(bundle, target) {
        try {
            const html = this.buildEmailHtml(bundle);
            const count = bundle.reviewItems.length;
            const subject = bundle.criticalCount > 0
                ? `YEAP · ${count} review${count === 1 ? '' : 's'} due · ${bundle.criticalCount} critical`
                : `YEAP · ${count} review${count === 1 ? '' : 's'} due today`;
            logger_1.logger.info(`[Resend] Attempting to send email to ${target} for userId=${bundle.userId}`);
            const sendPromise = this.resend.emails.send({
                from: `YEAP SRS <${this.fromEmail}>`,
                to: [target],
                subject,
                html,
            });
            // 10s timeout — don't let a hung Resend call block the daily worker
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Resend email send timed out after 10s')), 10000));
            const { data, error } = await Promise.race([sendPromise, timeoutPromise]);
            if (error) {
                throw new Error(error.message);
            }
            const messageId = data?.id ?? 'unknown';
            logger_1.logger.info(`[Resend] Email sent to ${target}, messageId: ${messageId}`);
            return {
                success: true,
                messageId,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger_1.logger.error(`[Resend] Send failed for userId=${bundle.userId}: ${message}`);
            throw error;
        }
    }
    // ─── Email template ────────────────────────────────────────────────────────
    escapeHtml(value) {
        return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
    }
    /** Outlined pill matching the app's <DifficultyBadge /> (Badge.tsx). */
    difficultyBadge(difficulty) {
        const normalized = difficulty.toUpperCase();
        const [fg, bg, edge] = normalized === 'EASY' ? [T.easy, T.easyTint, T.easyEdge]
            : normalized === 'MEDIUM' || normalized === 'MED' ? [T.medium, T.mediumTint, T.mediumEdge]
                : [T.hard, T.hardTint, T.hardEdge];
        return `<span style="display:inline-block;font-family:${T.mono};font-size:10px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:${fg};background-color:${bg};border:1px solid ${edge};border-radius:4px;padding:3px 8px;white-space:nowrap;">${this.escapeHtml(normalized)}</span>`;
    }
    /** Small uppercase mono section label, as used throughout the app. */
    sectionLabel(label, count) {
        return `
      <tr>
        <td style="padding:28px 24px 10px 24px;">
          <span style="font-family:${T.mono};font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:${T.textTertiary};">${label}</span>
          <span style="font-family:${T.mono};font-size:10px;font-weight:600;letter-spacing:0.14em;color:${T.textPrimary};">&nbsp;·&nbsp;${count}</span>
        </td>
      </tr>`;
    }
    /** One metric cell in the header stat strip (mono numerals, muted label). */
    statCell(label, value, color, first) {
        return `
      <td width="33.33%" style="padding:14px 12px;text-align:center;${first ? '' : `border-left:1px solid ${T.border};`}">
        <div style="font-family:${T.mono};font-size:22px;font-weight:600;line-height:1.1;color:${color};">${value}</div>
        <div style="font-family:${T.mono};font-size:9px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:${T.textTertiary};padding-top:5px;">${label}</div>
      </td>`;
    }
    reviewTable(items) {
        const th = (text, align) => `<th align="${align}" style="padding:9px 12px;font-family:${T.mono};font-size:9px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:${T.textTertiary};text-align:${align};">${text}</th>`;
        const rows = items
            .map((item, index) => {
            const last = index === items.length - 1;
            const edge = last ? 'none' : `1px solid ${T.divider}`;
            const critical = item.easinessFactor < CRITICAL_EF_THRESHOLD;
            return `
        <tr>
          <td style="padding:13px 12px;border-bottom:${edge};">
            <a href="https://leetcode.com/problems/${encodeURIComponent(item.problemSlug)}/"
               style="font-family:${T.sans};font-size:14px;font-weight:600;color:${T.indigoLight};text-decoration:none;">${this.escapeHtml(item.problemTitle)}</a>
          </td>
          <td align="center" style="padding:13px 12px;border-bottom:${edge};text-align:center;">${this.difficultyBadge(item.difficulty)}</td>
          <td align="right" style="padding:13px 12px;border-bottom:${edge};text-align:right;font-family:${T.mono};font-size:13px;color:${critical ? T.hard : T.textSecondary};">${item.easinessFactor.toFixed(2)}</td>
          <td align="right" style="padding:13px 12px;border-bottom:${edge};text-align:right;font-family:${T.mono};font-size:13px;color:${T.textSecondary};">${item.intervalDays}d</td>
        </tr>`;
        })
            .join('');
        return `
      <tr>
        <td style="padding:0 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:separate;border-spacing:0;background-color:${T.card};border:1px solid ${T.border};border-radius:8px;">
            <thead>
              <tr style="background-color:${T.elevated};">
                ${th('Problem', 'left')}
                ${th('Difficulty', 'center')}
                ${th('EF', 'right')}
                ${th('Interval', 'right')}
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </td>
      </tr>`;
    }
    buildEmailHtml(bundle) {
        const name = this.escapeHtml(bundle.recipientName);
        const dueToday = bundle.reviewItems.length;
        const standardItems = bundle.reviewItems.filter((item) => !item.isNewChallenge);
        const bonusItems = bundle.reviewItems.filter((item) => item.isNewChallenge);
        const appUrl = (process.env['FRONTEND_URL'] ?? '').replace(/\/$/, '');
        const preheader = bundle.criticalCount > 0
            ? `${dueToday} due today · ${bundle.criticalCount} critical · ${bundle.totalDue} in backlog`
            : `${dueToday} due today · ${bundle.totalDue} in backlog`;
        // Brand lockup — mirrors the nav mark on the landing page.
        const header = `
      <tr>
        <td style="padding:22px 24px;border-bottom:1px solid ${T.border};">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="28" style="width:28px;">
                <div style="width:28px;height:28px;background-color:${T.indigo};border-radius:6px;text-align:center;font-family:${T.mono};font-size:13px;font-weight:700;color:#ffffff;line-height:28px;">Y</div>
              </td>
              <td style="padding-left:10px;font-family:${T.mono};font-size:17px;font-weight:700;letter-spacing:-0.01em;color:${T.indigoLight};">YEAP</td>
              <td style="padding-left:12px;font-family:${T.mono};font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${T.textTertiary};border-left:1px solid ${T.border};">&nbsp;&nbsp;Your Early AM Practice</td>
            </tr>
          </table>
        </td>
      </tr>`;
        const greeting = `
      <tr>
        <td style="padding:30px 24px 18px 24px;">
          <h1 style="margin:0;font-family:${T.head};font-size:24px;font-weight:700;letter-spacing:-0.02em;color:${T.textPrimary};">Good morning, ${name}.</h1>
          <p style="margin:8px 0 0;font-family:${T.mono};font-size:12px;line-height:1.6;color:${T.textSecondary};">
            Your queue is compiled. Review these before you forget them.
          </p>
        </td>
      </tr>`;
        const statStrip = `
      <tr>
        <td style="padding:0 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:separate;border-spacing:0;background-color:${T.elevated};border:1px solid ${T.border};border-radius:8px;">
            <tr>
              ${this.statCell('Due today', String(dueToday), T.textPrimary, true)}
              ${this.statCell('Backlog', String(bundle.totalDue), T.textPrimary, false)}
              ${this.statCell('Critical', String(bundle.criticalCount), bundle.criticalCount > 0 ? T.hard : T.textTertiary, false)}
            </tr>
          </table>
        </td>
      </tr>`;
        const criticalCallout = bundle.criticalCount > 0
            ? `
      <tr>
        <td style="padding:14px 24px 0 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:${T.hardTint};border:1px solid ${T.hardEdge};border-radius:8px;">
            <tr>
              <td style="padding:12px 14px;font-family:${T.mono};font-size:11px;line-height:1.6;color:${T.textSecondary};">
                <span style="color:${T.hard};font-weight:600;">${bundle.criticalCount} critical</span>
                &nbsp;item${bundle.criticalCount === 1 ? '' : 's'} below EF ${CRITICAL_EF_THRESHOLD.toFixed(1)} — start here while you're fresh.
              </td>
            </tr>
          </table>
        </td>
      </tr>`
            : '';
        const emptyState = dueToday === 0
            ? `
      <tr>
        <td style="padding:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:${T.card};border:1px solid ${T.border};border-radius:8px;">
            <tr>
              <td style="padding:28px;text-align:center;font-family:${T.mono};font-size:12px;color:${T.textSecondary};">
                Nothing due today. Your intervals are holding — enjoy the morning.
              </td>
            </tr>
          </table>
        </td>
      </tr>`
            : '';
        const standardSection = standardItems.length > 0
            ? this.sectionLabel("Today's reviews", standardItems.length) + this.reviewTable(standardItems)
            : '';
        const bonusSection = bonusItems.length > 0
            ? this.sectionLabel('Bonus · FAANG challenges', bonusItems.length) + this.reviewTable(bonusItems)
            : '';
        // Primary button matching Button.tsx (indigo, inset top highlight).
        const cta = appUrl
            ? `
      <tr>
        <td style="padding:26px 24px 4px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background-color:${T.indigo};border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.2);">
                <a href="${appUrl}/dashboard" style="display:inline-block;padding:11px 20px;font-family:${T.sans};font-size:13px;font-weight:600;color:${T.onIndigo};text-decoration:none;">Open today's queue &rarr;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
            : '';
        const footer = `
      <tr>
        <td style="padding:24px;border-top:1px solid ${T.border};">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
            <tr>
              <td style="font-family:${T.mono};font-size:11px;color:${T.textTertiary};">
                <span style="color:${T.indigoLight};font-weight:700;">YEAP</span>&nbsp;·&nbsp;Your Early AM Practice
              </td>
              <td align="right" style="font-family:${T.mono};font-size:11px;color:${T.textTertiary};text-align:right;">SM-2 Algorithm</td>
            </tr>
          </table>
        </td>
      </tr>`;
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>YEAP Morning Review</title>
</head>
<body style="margin:0;padding:0;background-color:${T.canvas};color:${T.textPrimary};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${this.escapeHtml(preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${T.canvas}" style="width:100%;background-color:${T.canvas};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:${T.card};border:1px solid ${T.border};border-radius:12px;">
          ${header}
          ${greeting}
          ${statStrip}
          ${criticalCallout}
          ${emptyState}
          ${standardSection}
          ${bonusSection}
          ${cta}
          ${footer}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }
}
exports.ResendNotificationProvider = ResendNotificationProvider;
//# sourceMappingURL=ResendNotificationProvider.js.map