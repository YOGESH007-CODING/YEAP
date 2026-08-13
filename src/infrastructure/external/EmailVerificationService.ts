import { Resend } from 'resend';
import { logger } from '../../shared/utils/logger';

export const sendEmailVerificationCode = async (email: string, code: string): Promise<void> => {
  const apiKey = process.env['RESEND_API_KEY'];
  if (!apiKey) throw new Error('Email delivery is not configured');

  const from = process.env['NOTIFICATION_FROM_EMAIL'] ?? 'noreply@yeap.dev';
  const { error } = await new Resend(apiKey).emails.send({
    from: `YEAP <${from}>`,
    to: [email],
    subject: 'Verify your YEAP email address',
    text: `Your YEAP verification code is ${code}. It expires in 10 minutes. Do not share this code.`,
    html: `<p>Your YEAP verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:0.2em">${code}</p><p>This code expires in 10 minutes. Do not share it.</p>`,
  });
  if (error) {
    logger.error('[EmailVerification] Resend delivery failed', { error: error.message });
    throw new Error('Email delivery failed');
  }
};
