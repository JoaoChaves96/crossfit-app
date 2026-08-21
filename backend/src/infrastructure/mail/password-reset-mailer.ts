import { Inject, Injectable } from '@nestjs/common';
import { MAIL_DRIVER_TOKEN } from './mail.types';
// `import type`: MailDriver is an interface and appears in a decorated
// constructor signature, which emitDecoratorMetadata + isolatedModules would
// otherwise try to emit a runtime reference for (TS1272).
import type { MailDriver } from './mail.types';
import { renderPasswordResetEmail } from './templates/password-reset-email';

export interface SendPasswordResetEmailInput {
  email: string;
  recipientName: string | null;
  resetLink: string;
  expiresAt: Date;
}

/**
 * The only mail-aware thing the password-reset domain sees. It throws on
 * failure — PasswordResetService is what swallows that, so the failure path
 * stays in one place. Mirrors InviteMailer.
 *
 * No replyTo, unlike an invite: there is no inviting human to reply to.
 */
@Injectable()
export class PasswordResetMailer {
  constructor(@Inject(MAIL_DRIVER_TOKEN) private readonly driver: MailDriver) {}

  async sendPasswordResetEmail(
    input: SendPasswordResetEmailInput,
  ): Promise<void> {
    const { subject, html, text } = renderPasswordResetEmail({
      recipientName: input.recipientName,
      resetLink: input.resetLink,
      expiresAt: input.expiresAt,
    });

    await this.driver.send({
      to: input.email,
      subject,
      html,
      text,
    });
  }
}
