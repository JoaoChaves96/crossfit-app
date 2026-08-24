import { renderPasswordChangedEmail } from './password-changed-email';

describe('renderPasswordChangedEmail', () => {
  const baseInput = { recipientName: 'Jane Doe' };

  it('states plainly what happened, in both parts', () => {
    const { subject, html, text } = renderPasswordChangedEmail(baseInput);
    expect(subject).toBe('Your BoxOps password was changed');
    expect(html).toContain('was just changed');
    expect(text).toContain('was just changed');
  });

  // The reason this template exists in the shape it does: a "secure your
  // account" link in a security email is indistinguishable from phishing, so
  // the reader is pointed at the sign-in screen they already know.
  it('contains no link, no url and no accent colour', () => {
    const { html, text } = renderPasswordChangedEmail(baseInput);
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('href');
    expect(html).not.toContain('http');
    expect(html).not.toContain('#E23B4E');
    expect(text).not.toContain('http');
  });

  it('tells the reader that ignoring it is fine if it was them', () => {
    const { html, text } = renderPasswordChangedEmail(baseInput);
    expect(html).toContain('there is nothing to do');
    expect(text).toContain('there is nothing to do');
  });

  it('names the reset route without linking it, and repeats the no-revocation limit', () => {
    const { text } = renderPasswordChangedEmail(baseInput);
    expect(text).toContain('Forgot password?');
    expect(text).toContain('stays signed in');
  });

  it('escapes html in the recipient name', () => {
    const { html } = renderPasswordChangedEmail({
      recipientName: '<script>alert(1)</script>',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('greets without a name when there is none', () => {
    const { html, text } = renderPasswordChangedEmail({
      recipientName: null,
    });
    expect(html).toContain('Hi there');
    expect(text).toContain('Hi there');
  });
});
