import nodemailer from 'nodemailer';
import logger from './logger';

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

const transport = SMTP_HOST && SMTP_PORT && SMTP_FROM
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465, // SMTP2GO supports TLS on 465
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : null;

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  if (!transport) {
    logger.warn('SMTP not configured; skipping password reset email');
    return;
  }

  const from = SMTP_FROM!;
  const subject = 'Reset your RailPulse password';
  const text = [
    'Hi,',
    '',
    'We received a request to reset your password.',
    `Reset link: ${resetLink}`,
    '',
    'If you did not request this, you can safely ignore this email.',
    '',
    'This is a transactional email for account security; no subscription is required. To stop receiving these, delete your account or contact support.',
  ].join('\n');
  const html = buildResetHtml(resetLink);

  try {
    await transport.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    logger.info(`Password reset email sent to ${to}`);
  } catch (error: any) {
    logger.error(`Failed to send password reset email: ${error.message}`);
    throw error;
  }
}

export function isSmtpConfigured(): boolean {
  return !!transport;
}

function buildResetHtml(resetLink: string): string {
  const safeLink = resetLink.replace(/"/g, '%22');
  return `
  <div style="background:#f5f7fb;padding:32px 0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;box-shadow:0 20px 60px rgba(15,23,42,0.1);overflow:hidden;">
      <tr>
        <td style="padding:28px 32px;border-bottom:1px solid #e2e8f0;">
          <div style="font-size:20px;font-weight:700;color:#0f172a;">RailPulse</div>
          <div style="margin-top:6px;font-size:14px;color:#64748b;">Reset your password</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px;">
          <p style="margin:0 0 14px 0;font-size:15px;color:#0f172a;">Hello,</p>
          <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#334155;">We received a request to reset your password for RailPulse. Click the button below to choose a new one. The link will expire in 60 minutes.</p>
          <div style="text-align:center;margin:22px 0;">
            <a href="${safeLink}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 22px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;box-shadow:0 10px 30px rgba(17,24,39,0.18);">Reset password</a>
          </div>
          <p style="margin:0 0 12px 0;font-size:13px;color:#6b7280;">If the button does not work, copy and paste this link into your browser:</p>
          <p style="margin:0 0 18px 0;font-size:13px;word-break:break-all;color:#0f172a;">${safeLink}</p>
          <p style="margin:0 0 12px 0;font-size:13px;color:#6b7280;">If you did not request a password reset, you can safely ignore this email.</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;">This is a transactional email for account security. To stop receiving these, delete your account or contact support.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 32px;background:#0f172a;color:#cbd5e1;font-size:12px;text-align:center;">
          RailPulse · Automated message
        </td>
      </tr>
    </table>
  </div>
  `;
}
