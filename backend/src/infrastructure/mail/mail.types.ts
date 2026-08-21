/**
 * The mail seam. A driver either delivers or throws — it never reports
 * failure by returning, because the only caller (announceInviteLink) turns
 * an exception into a status and must not have to inspect a result object.
 */
export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export interface MailDriver {
  send(message: MailMessage): Promise<void>;
}

export class MailDeliveryError extends Error {
  constructor(reason: string) {
    super(`Email delivery failed: ${reason}`);
    this.name = 'MailDeliveryError';
  }
}

export const MAIL_DRIVER_TOKEN = Symbol('MailDriver');

export const DEFAULT_MAIL_FROM = 'BoxOps <invites@mail.boxops.dev>';
