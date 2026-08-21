/**
 * The invite emails. Two wordings, one layout.
 *
 * Constraints that look like mistakes but are not:
 * - Table layout and inline styles. Email clients do not do flexbox.
 * - No @font-face, so the Named-Face Rule cannot apply literally; a system
 *   serif/sans stack is as close to Clean Ink as email gets.
 * - Hex values are hardcoded. A backend file importing the frontend's token
 *   module would be a new cross-boundary dependency for two colours.
 * - The accent appears exactly once (the CTA button). One Accent Rule.
 * - The CTA says "View invite", not "Accept invite". The link only opens the
 *   invite screen in the app, where accepting is a separate, deliberate press.
 *   A button that claims to accept would commit the reader to a gym by one
 *   click from their inbox — a promise the link does not keep.
 */

export interface InviteEmailInput {
  role: 'athlete' | 'coach';
  gymName: string;
  inviterName: string | null;
  inviteLink: string;
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

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatExpiry(expiresAt: Date): string {
  return expiresAt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function copyFor(input: InviteEmailInput): {
  subject: string;
  intro: string;
  detail: string;
} {
  const { role, gymName, inviterName } = input;

  if (role === 'coach') {
    return {
      subject: `${gymName} invited you to coach on BoxOps`,
      intro: inviterName
        ? `${inviterName} invited you to coach at ${gymName}.`
        : `You've been invited to coach at ${gymName}.`,
      detail:
        'Accepting adds you to their coaching staff — you will be able to see your assigned ' +
        'classes, mark attendance, and view results.',
    };
  }

  return {
    subject: `You're invited to join ${gymName} on BoxOps`,
    intro: inviterName
      ? `${inviterName} invited you to join ${gymName}.`
      : `You've been invited to join ${gymName}.`,
    detail: 'Accepting lets you book classes and log your results.',
  };
}

export function renderInviteEmail(input: InviteEmailInput): RenderedEmail {
  const { subject, intro, detail } = copyFor(input);
  const expiry = formatExpiry(input.expiresAt);
  const link = input.inviteLink;

  const text = [
    intro,
    '',
    detail,
    '',
    'View your invite:',
    link,
    '',
    `This link expires on ${expiry} — 7 days from when it was sent.`,
    '',
    'BoxOps',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${PAPER};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAPER};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#FFFFFF;border:1px solid ${HAIRLINE};">
        <tr>
          <td style="padding:24px 28px 8px 28px;font-family:${SANS};font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${INK_MUTED};">
            BoxOps
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px;">
            <div style="height:1px;background-color:${HAIRLINE};"></div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px 8px 28px;font-family:${SANS};font-size:18px;line-height:1.4;font-weight:600;color:${INK_STRONG};">
            ${escapeHtml(intro)}
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px 28px;font-family:${SANS};font-size:15px;line-height:1.55;color:${INK_MUTED};">
            ${escapeHtml(detail)}
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px 28px;">
            <a href="${escapeHtml(link)}" style="display:inline-block;background-color:${ACCENT};color:#FFFFFF;font-family:${SANS};font-size:15px;font-weight:600;text-decoration:none;padding:12px 22px;">
              View invite
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
            This link expires on ${escapeHtml(expiry)} — 7 days from when it was sent.
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
