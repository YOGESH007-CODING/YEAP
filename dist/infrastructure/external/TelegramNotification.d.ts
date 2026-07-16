/**
 * src/infrastructure/external/TelegramNotification.ts
 *
 * Concrete INotificationProvider implementation using the Telegram Bot API.
 * Sends richly formatted daily review bundles via Telegram messages.
 */
import type { INotificationProvider, DailyBundle, NotificationResult } from '../../domain/interfaces/INotificationProvider';
export declare class TelegramNotificationProvider implements INotificationProvider {
    private readonly botToken;
    private readonly baseUrl;
    constructor(botToken?: string);
    sendDailyBundle(bundle: DailyBundle, target: string): Promise<NotificationResult>;
    private formatBundle;
}
//# sourceMappingURL=TelegramNotification.d.ts.map