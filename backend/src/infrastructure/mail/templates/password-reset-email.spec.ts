import { renderPasswordResetEmail } from './password-reset-email';

describe('renderPasswordResetEmail', () => {
  const baseInput = {
    recipientName: 'Jane Doe',
    resetLink: 'https://app.boxops.dev/reset-password/abc123',
    // 23:30 UTC deliberately: a host in UTC+2 would render this as the 2nd
    // unless the formatter pins timeZone: 'UTC'.
    expiresAt: new Date('2026-09-01T23:30:00.000Z'),
  };

  it('includes the reset link in both the html and the text part', () => {
    const { html, text } = renderPasswordResetEmail(baseInput);
    expect(html).toContain(baseInput.resetLink);
    expect(text).toContain(baseInput.resetLink);
  });

  it('formats the expiry in UTC regardless of the host clock zone', () => {
    const { html } = renderPasswordResetEmail(baseInput);
    expect(html).toContain('1 September 2026');
  });

  it('says the link expires in an hour', () => {
    const { html, text } = renderPasswordResetEmail(baseInput);
    expect(html).toContain('1 hour');
    expect(text).toContain('1 hour');
  });

  it('reassures the reader that ignoring it changes nothing', () => {
    const { text } = renderPasswordResetEmail(baseInput);
    expect(text).toContain('your password has not changed');
  });

  it('uses the accent colour exactly once — One Accent Rule', () => {
    const { html } = renderPasswordResetEmail(baseInput);
    expect(html.match(/#E23B4E/g)).toHaveLength(1);
  });

  it('escapes html in the recipient name', () => {
    const { html } = renderPasswordResetEmail({
      ...baseInput,
      recipientName: '<script>alert(1)</script>',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('greets without a name when there is none', () => {
    const { html } = renderPasswordResetEmail({
      ...baseInput,
      recipientName: null,
    });
    expect(html).toContain('Hi there');
  });
});
