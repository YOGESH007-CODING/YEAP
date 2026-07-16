"use strict";
/**
 * src/infrastructure/external/TelegramNotification.ts
 *
 * Concrete INotificationProvider implementation using the Telegram Bot API.
 * Sends richly formatted daily review bundles via Telegram messages.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramNotificationProvider = void 0;
const logger_1 = require("../../shared/utils/logger");
// ─── Provider ─────────────────────────────────────────────────────────────────
class TelegramNotificationProvider {
    constructor(botToken) {
        const token = botToken ?? process.env['TELEGRAM_BOT_TOKEN'];
        if (!token) {
            throw new Error('TELEGRAM_BOT_TOKEN is required for TelegramNotificationProvider');
        }
        this.botToken = token;
        this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    }
    async sendDailyBundle(bundle, target) {
        try {
            const text = this.formatBundle(bundle);
            const response = await fetch(`${this.baseUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: target,
                    text,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                }),
            });
            const result = (await response.json());
            if (!result.ok) {
                logger_1.logger.error(`[Telegram] API error: ${result.description}`);
                return { success: false, error: result.description };
            }
            logger_1.logger.info(`[Telegram] Message sent to chat ${target}, id: ${result.result?.message_id}`);
            return {
                success: true,
                messageId: String(result.result?.message_id),
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger_1.logger.error(`[Telegram] Send failed: ${message}`);
            return { success: false, error: message };
        }
    }
    // ─── Private Formatters ───────────────────────────────────────────────────
    formatBundle(bundle) {
        const difficultyEmoji = (d) => d === 'EASY' ? '🟢' : d === 'MEDIUM' ? '🟡' : '🔴';
        const efBar = (ef) => {
            const bars = Math.round((ef - 1.3) / (4.0 - 1.3) * 5);
            return '█'.repeat(bars) + '░'.repeat(5 - bars);
        };
        const standardItems = bundle.reviewItems.filter((item) => !item.isNewChallenge);
        const bonusItems = bundle.reviewItems.filter((item) => item.isNewChallenge);
        const formatItems = (items, startIndex) => items
            .map((item, i) => `${startIndex + i}. ${difficultyEmoji(item.difficulty)} <b>${item.problemTitle}</b>\n` +
            `   🧠 EF: ${item.easinessFactor.toFixed(2)} [${efBar(item.easinessFactor)}]\n` +
            `   📅 Interval: ${item.intervalDays}d\n` +
            `   🔗 <a href="https://leetcode.com/problems/${item.problemSlug}/">Open on LeetCode</a>`)
            .join('\n\n');
        const criticalWarning = bundle.criticalCount > 0
            ? `\n⚠️ <b>${bundle.criticalCount} critical item(s)</b> with sinking EF — prioritize these!\n`
            : '';
        let text = `🌅 <b>YEAP — Morning Review</b> for ${bundle.recipientName}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📊 <b>${bundle.reviewItems.length} items today</b> (${bundle.totalDue} total due)${criticalWarning}\n\n`;
        if (standardItems.length > 0) {
            text += `<b>📚 Today's Reviews</b>\n`;
            text += `${formatItems(standardItems, 1)}\n\n`;
        }
        if (bonusItems.length > 0) {
            const bonusHeaderIndex = standardItems.length > 0 ? standardItems.length + 1 : 1;
            text += `🌟 <b>Bonus FAANG Challenges</b>\n`;
            text += `${formatItems(bonusItems, bonusHeaderIndex)}\n\n`;
        }
        text += `━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `<i>Review via your YEAP app or tap the links above.</i>`;
        return text;
    }
}
exports.TelegramNotificationProvider = TelegramNotificationProvider;
//# sourceMappingURL=TelegramNotification.js.map