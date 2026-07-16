/**
 * src/domain/interfaces/INotificationProvider.ts
 *
 * Contract for all notification delivery providers.
 * Concrete implementations (Telegram, SendGrid) live in src/infrastructure/external/.
 */

export interface ReviewItem {
  problemSlug: string;
  problemTitle: string;
  difficulty: string;
  dueDate: Date;
  easinessFactor: number;
  intervalDays: number;
  isNewChallenge?: boolean;
}

export interface DailyBundle {
  userId: string;
  recipientName: string;
  reviewItems: ReviewItem[];
  totalDue: number;
  criticalCount: number; // items with EF < 1.8
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface INotificationProvider {
  /**
   * Sends the daily review bundle to a single user.
   *
   * @param bundle - The compiled review bundle for one user.
   * @param target - The delivery target (e.g., chatId, email address).
   * @returns        Result indicating success or failure.
   */
  sendDailyBundle(bundle: DailyBundle, target: string): Promise<NotificationResult>;
}
