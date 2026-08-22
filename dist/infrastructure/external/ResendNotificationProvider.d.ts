/**
 * src/infrastructure/external/ResendNotificationProvider.ts
 *
 * INotificationProvider implementation using Resend for email delivery.
 * Sends the daily review bundle as an HTML email styled to match the YEAP web
 * app's "Obsidian Protocol" design language (see frontend/src/index.css).
 */
import type { INotificationProvider, DailyBundle, NotificationResult } from '../../domain/interfaces/INotificationProvider';
export declare class ResendNotificationProvider implements INotificationProvider {
    private readonly resend;
    private readonly fromEmail;
    constructor(apiKey?: string, fromEmail?: string);
    sendDailyBundle(bundle: DailyBundle, target: string): Promise<NotificationResult>;
    private escapeHtml;
    /** Outlined pill matching the app's <DifficultyBadge /> (Badge.tsx). */
    private difficultyBadge;
    /** Small uppercase mono section label, as used throughout the app. */
    private sectionLabel;
    /** One metric cell in the header stat strip (mono numerals, muted label). */
    private statCell;
    private reviewTable;
    private buildEmailHtml;
}
//# sourceMappingURL=ResendNotificationProvider.d.ts.map