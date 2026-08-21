/**
 * The password-reset email. One wording — unlike invites there is no role split.
 *
 * Same constraints as invite-email.ts: table layout and inline styles because
 * email clients do not do flexbox; hex values hardcoded rather than importing
 * the frontend's token module across the project boundary; the accent appears
 * exactly once, on the CTA.
 *
 * The CTA reads "Choose a new password" — it describes what the link opens, a
 * screen where the reader types a password. Nothing is reset by clicking.
 */

export interface PasswordResetEmailInput {
  recipientName: string | null;
  resetLink: string;
  expiresAt: Date;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const ACCENT = '#E23B4E';
const INK_STRONG = '#1A1A1A';
const INK_MUTED = '#5C5C5C';
const HAIRLINE = '#E5E2DD';
const PAPER = '#FBFAF8';

const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// timeZone pinned to UTC: without it the same instant renders as a different
// day depending on the host's clock zone, so staging and a laptop disagree.
function formatExpiry(expiresAt: Date): string {
  return expiresAt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function renderPasswordResetEmail(
  input: PasswordResetEmailInput,
): RenderedEmail {
  const subject = 'Reset your BoxOps password';
  const greeting = input.recipientName
    ? `Hi ${input.recipientName}`
    : 'Hi there';
  const link = input.resetLink;
  const expiry = formatExpiry(input.expiresAt);

  const text = [
    `${greeting},`,
    '',
    'Someone asked to reset the password on your BoxOps account. If it was you, open this link to choose a new one:',
    '',
    link,
    '',
    `The link works for 1 hour (until ${expiry}, UTC) and can be used once.`,
    '',
    'If it was not you, ignore this email — your password has not changed.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:${PAPER};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAPER};padding:32px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:100%;background-color:#FFFFFF;border:1px solid ${HAIRLINE};">
        <tr>
          <td style="padding:28px 28px 12px 28px;font-family:${SANS};font-size:20px;font-weight:700;color:${INK_STRONG};">
            Reset your password
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 16px 28px;font-family:${SANS};font-size:15px;line-height:1.55;color:${INK_STRONG};">
            ${escapeHtml(greeting)}, someone asked to reset the password on your BoxOps account.
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px 28px;font-family:${SANS};font-size:15px;line-height:1.55;color:${INK_MUTED};">
            If it was you, choose a new one below. If it was not, ignore this email — your password has not changed.
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px 28px;">
            <a href="${escapeHtml(link)}" style="display:inline-block;background-color:${ACCENT};color:#FFFFFF;font-family:${SANS};font-size:15px;font-weight:600;text-decoration:none;padding:12px 22px;">
              Choose a new password
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px 28px;font-family:${SANS};font-size:13px;line-height:1.5;color:${INK_MUTED};">
            Or paste this into your browser:<br />
            <span style="word-break:break-all;">${escapeHtml(link)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px;">
            <div style="height:1px;background-color:${HAIRLINE};"></div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 24px 28px;font-family:${SANS};font-size:12px;line-height:1.5;color:${INK_MUTED};">
            This link works for 1 hour — until ${escapeHtml(expiry)} (UTC) — and can be used once.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject, html, text };
}
