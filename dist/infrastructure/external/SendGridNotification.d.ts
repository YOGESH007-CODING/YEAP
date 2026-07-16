/**
 * src/infrastructure/external/SendGridNotification.ts
 *
 * Alternative INotificationProvider implementation using SendGrid email delivery.
 * Sends richly formatted HTML daily review bundles via transactional email.
 */
import type { INotificationProvider, DailyBundle, NotificationResult } from '../../domain/interfaces/INotificationProvider';
export declare class SendGridNotificationProvider implements INotificationProvider {
    private readonly apiKey;
    private readonly fromEmail;
    constructor(apiKey?: string, fromEmail?: string);
    sendDailyBundle(bundle: DailyBundle, target: string): Promise<NotificationResult>;
    private buildEmailHtml;
}
//# sourceMappingURL=SendGridNotification.d.ts.map