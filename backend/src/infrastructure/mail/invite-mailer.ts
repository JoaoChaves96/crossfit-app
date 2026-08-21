import { Inject, Injectable } from '@nestjs/common';
import { MAIL_DRIVER_TOKEN } from './mail.types';
// `import type`: MailDriver is an interface and appears in a decorated
// constructor signature, which emitDecoratorMetadata + isolatedModules would
// otherwise try to emit a runtime reference for (TS1272).
import type { MailDriver } from './mail.types';
import { renderInviteEmail } from './templates/invite-email';

export interface SendInviteEmailInput {
  role: 'athlete' | 'coach';
  inviteeEmail: string;
  gymName: string;
  inviterName: string | null;
  inviterEmail: string | null;
  inviteLink: string;
  expiresAt: Date;
}

/**
 * The only mail-aware thing the invite domain sees. It throws on failure —
 * announceInviteLink is what turns that into a status, so the failure path
 * stays in one place.
 */
@Injectable()
export class InviteMailer {
  constructor(@Inject(MAIL_DRIVER_TOKEN) private readonly driver: MailDriver) {}

  async sendInviteEmail(input: SendInviteEmailInput): Promise<void> {
    const { subject, html, text } = renderInviteEmail({
      role: input.role,
      gymName: input.gymName,
      inviterName: input.inviterName,
      inviteLink: input.inviteLink,
      expiresAt: input.expiresAt,
    });

    await this.driver.send({
      to: input.inviteeEmail,
      subject,
      html,
      text,
      ...(input.inviterEmail ? { replyTo: input.inviterEmail } : {}),
    });
  }
}
