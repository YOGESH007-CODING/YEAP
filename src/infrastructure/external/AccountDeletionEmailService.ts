import { Resend } from 'resend';
import { logger } from '../../shared/utils/logger';

export const sendAccountDeletionConfirmation = async (email: string, requestId: string): Promise<void> => {
  const apiKey = process.env['RESEND_API_KEY'];
  if (!apiKey) {
    logger.warn('[AccountDeletion] Confirmation email not configured', { requestId });
    return;
  }
  const from = process.env['NOTIFICATION_FROM_EMAIL'] ?? 'noreply@yeap.dev';
  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: `YEAP <${from}>`, to: [email], subject: 'Your YEAP account has been deleted',
      text: 'Your YEAP account has been deleted. If you did not request this, contact support immediately.',
    });
    if (error) throw new Error(error.message);
  } catch {
    // Deletion and revocation already completed; never expose mail-provider errors.
    logger.error('[AccountDeletion] Confirmation email delivery failed', { requestId });
  }
};
