import { createMailDriver } from './mail-driver.factory';
import { LogDriver } from './log.driver';
import { ResendDriver } from './resend.driver';

describe('createMailDriver', () => {
  it('defaults to the log driver when MAIL_DRIVER is unset', () => {
    expect(createMailDriver({})).toBeInstanceOf(LogDriver);
  });

  it('builds a Resend driver when asked for one and a key is present', () => {
    expect(createMailDriver({ MAIL_DRIVER: 'resend', RESEND_API_KEY: 're_key' })).toBeInstanceOf(
      ResendDriver,
    );
  });

  // Presence only, never validity: the forced-failure verification on staging
  // sets a real-looking but wrong key and needs the app to boot so Resend can
  // answer 401 at send time.
  it('refuses to build a Resend driver without a key', () => {
    expect(() => createMailDriver({ MAIL_DRIVER: 'resend' })).toThrow(/RESEND_API_KEY/);
  });

  it('rejects an unknown driver name rather than silently not sending', () => {
    expect(() => createMailDriver({ MAIL_DRIVER: 'sendgrid' })).toThrow(/sendgrid/);
  });
});
