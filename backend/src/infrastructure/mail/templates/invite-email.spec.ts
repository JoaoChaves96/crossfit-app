import { renderInviteEmail } from './invite-email';

const BASE = {
  gymName: 'Box One',
  inviterName: 'Olive Owner',
  inviteLink: 'https://app.boxops.dev/invite/tok-abc',
  expiresAt: new Date('2026-08-28T10:00:00.000Z'),
};

describe('renderInviteEmail', () => {
  it('names the gym, the inviter, the link and the expiry in both parts, for an athlete', () => {
    const { subject, html, text } = renderInviteEmail({ ...BASE, role: 'athlete' });

    expect(subject).toBe("You're invited to join Box One on BoxOps");
    for (const part of [html, text]) {
      expect(part).toContain('Box One');
      expect(part).toContain('Olive Owner');
      expect(part).toContain('https://app.boxops.dev/invite/tok-abc');
      expect(part).toContain('28 August 2026');
    }
    expect(text).toContain('book classes and log your results');
  });

  it('tells a coach they are being offered a job, not a membership', () => {
    const { subject, html, text } = renderInviteEmail({ ...BASE, role: 'coach' });

    expect(subject).toBe('Box One invited you to coach on BoxOps');
    expect(text).toContain('coaching staff');
    expect(html).toContain('mark attendance');
    expect(text).not.toContain('book classes and log your results');
  });

  // The expiry date must not depend on the server's clock zone: an unpinned
  // format would say "27 August" on a US host for the same instant.
  it('formats the expiry date in UTC regardless of the process timezone', () => {
    const { text } = renderInviteEmail({
      ...BASE,
      role: 'athlete',
      expiresAt: new Date('2026-08-28T01:00:00.000Z'),
    });

    expect(text).toContain('28 August 2026');
  });

  it('falls back to the gym alone when the inviter cannot be resolved', () => {
    const { html, text } = renderInviteEmail({ ...BASE, role: 'coach', inviterName: null });

    expect(text).toContain("You've been invited to coach at Box One");
    expect(html).not.toContain('null');
    expect(html).not.toContain('undefined');
  });

  // The link opens the invite screen; accepting is a separate press there. A CTA
  // reading "Accept" would promise an action the click does not perform.
  it('offers to open the invite rather than claiming to accept it', () => {
    for (const role of ['athlete', 'coach'] as const) {
      const { html, text } = renderInviteEmail({ ...BASE, role });

      expect(html).toContain('View invite');
      expect(html).not.toContain('Accept invite');
      expect(text).toContain('View your invite:');
      expect(text).not.toContain('Accept your invite');
    }
  });

  // The One Accent Rule, enforced rather than trusted: the CTA button is
  // the single crimson element in the message.
  it('uses the accent exactly once and never the danger red', () => {
    const { html } = renderInviteEmail({ ...BASE, role: 'athlete' });

    expect(html.match(/#E23B4E/gi)).toHaveLength(1);
    expect(html).not.toContain('#B3261E');
  });

  it('escapes gym and inviter names so they cannot inject markup', () => {
    const { html } = renderInviteEmail({
      ...BASE,
      role: 'athlete',
      gymName: 'Box <script>alert(1)</script>',
      inviterName: 'A & B',
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B');
  });

  it('repeats the link as plain text in the HTML, for clients that strip buttons', () => {
    const { html } = renderInviteEmail({ ...BASE, role: 'athlete' });

    expect(
      html.match(/https:\/\/app\.boxops\.dev\/invite\/tok-abc/g)!.length,
    ).toBeGreaterThanOrEqual(2);
  });
});
