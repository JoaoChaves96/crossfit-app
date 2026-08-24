import { Inject, Injectable } from '@nestjs/common';
import { MAIL_DRIVER_TOKEN } from './mail.types';
// `import type`: MailDriver is an interface and appears in a decorated
// constructor signature, which emitDecoratorMetadata + isolatedModules would
// otherwise try to emit a runtime reference for (TS1272).
import type { MailDriver } from './mail.types';
import { renderPasswordChangedEmail } from './templates/password-changed-email';

export interface SendPasswordChangedEmailInput {
  email: string;
  recipientName: string | null;
}

/**
 * The only mail-aware thing the password-change domain sees. It throws on
 * failure — PasswordChangeService is what swallows that, so the failure path
 * stays in one place. Mirrors PasswordResetMailer.
 *
 * The input carries no token, link or expiry: this notification is a statement
 * about something that already happened, not an invitation to act.
 */
@Injectable()
export class PasswordChangedMailer {
  constructor(@Inject(MAIL_DRIVER_TOKEN) private readonly driver: MailDriver) {}

  async sendPasswordChangedEmail(
    input: SendPasswordChangedEmailInput,
  ): Promise<void> {
    const { subject, html, text } = renderPasswordChangedEmail({
      recipientName: input.recipientName,
    });

    await this.driver.send({
      to: input.email,
      subject,
      html,
      text,
    });
  }
}
