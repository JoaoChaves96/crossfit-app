import { DEFAULT_MAIL_FROM, MailDriver } from './mail.types';
import { LogDriver } from './log.driver';
import { ResendDriver } from './resend.driver';

/**
 * Boot-time selection, so a misconfigured environment fails the deploy rather
 * than the first invite an owner creates. The key is checked for presence and
 * never for validity — see mail-driver.factory.spec.ts.
 */
export function createMailDriver(env: NodeJS.ProcessEnv): MailDriver {
  const from = env.MAIL_FROM || DEFAULT_MAIL_FROM;
  const name = env.MAIL_DRIVER || 'log';

  switch (name) {
    case 'log':
      return new LogDriver(from, env.MAIL_PREVIEW_DIR);
    case 'resend': {
      if (!env.RESEND_API_KEY) {
        throw new Error(
          'MAIL_DRIVER=resend requires RESEND_API_KEY. Refusing to start: a missing key ' +
            'would mean every invite silently failed to send.',
        );
      }
      return new ResendDriver(env.RESEND_API_KEY, from);
    }
    default:
      throw new Error(`Unknown MAIL_DRIVER "${name}". Valid values are "log" and "resend".`);
  }
}
