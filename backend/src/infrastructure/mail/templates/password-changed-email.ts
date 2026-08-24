/**
 * The "your password was changed" notification.
 *
 * This is the only signal a user gets that someone who already knew their
 * password has taken the account: a change revokes no existing session
 * (epics/PASSWORD_RESET_EPIC.md), so without this mail the takeover is silent.
 * That is why it carries no link and no CTA — **it has no accent at all**. The
 * reader either did this and can ignore it, or did not and must act, and the
 * action is the reset flow they already know how to reach. A CTA here would be
 * a click-this-to-secure-your-account link in an email about account security,
 * which is the exact shape of a phishing message.
 *
 * Same constraints as the sibling templates: table layout and inline styles
 * because email clients do not do flexbox, and hex values hardcoded rather than
 * importing the frontend's token module across the project boundary.
 */

export interface PasswordChangedEmailInput {
  recipientName: string | null;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

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

export function renderPasswordChangedEmail(
  input: PasswordChangedEmailInput,
): RenderedEmail {
  const subject = 'Your BoxOps password was changed';
  const greeting = input.recipientName
    ? `Hi ${input.recipientName}`
    : 'Hi there';

  const text = [
    `${greeting},`,
    '',
    'The password on your BoxOps account was just changed.',
    '',
    'If you did this, there is nothing to do.',
    '',
    'If you did not, someone else knows your password. Use the "Forgot password?" link on the sign-in screen to take the account back, and be aware that anyone already signed in stays signed in.',
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
            Your password was changed
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 16px 28px;font-family:${SANS};font-size:15px;line-height:1.55;color:${INK_STRONG};">
            ${escapeHtml(greeting)}, the password on your BoxOps account was just changed.
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px 28px;font-family:${SANS};font-size:15px;line-height:1.55;color:${INK_MUTED};">
            If you did this, there is nothing to do.
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px;">
            <div style="height:1px;background-color:${HAIRLINE};"></div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 24px 28px;font-family:${SANS};font-size:13px;line-height:1.5;color:${INK_MUTED};">
            If you did not, someone else knows your password. Use the
            &ldquo;Forgot password?&rdquo; link on the sign-in screen to take the
            account back &mdash; and note that anyone already signed in stays
            signed in.
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
