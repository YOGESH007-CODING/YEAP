/**
 * src/infrastructure/external/ResendNotificationProvider.ts
 *
 * INotificationProvider implementation using Resend for email delivery.
 * Sends richly formatted HTML daily review bundles.
 */
import type { INotificationProvider, DailyBundle, NotificationResult } from '../../domain/interfaces/INotificationProvider';
export declare class ResendNotificationProvider implements INotificationProvider {
    private readonly resend;
    private readonly fromEmail;
    constructor(apiKey?: string, fromEmail?: string);
    sendDailyBundle(bundle: DailyBundle, target: string): Promise<NotificationResult>;
    private buildEmailHtml;
}
//# sourceMappingURL=ResendNotificationProvider.d.ts.map