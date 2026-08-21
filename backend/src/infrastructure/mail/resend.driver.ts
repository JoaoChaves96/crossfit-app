import { MailDeliveryError, MailDriver, MailMessage } from './mail.types';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * Resend over plain fetch. No SDK: this is one POST, and owning the error
 * mapping ourselves is what lets announceInviteLink report a status instead
 * of guessing at a wrapper's exception types.
 */
export class ResendDriver implements MailDriver {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: MailMessage): Promise<void> {
    let response: Response;
    try {
      response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
      });
    } catch (err) {
      throw new MailDeliveryError(
        err instanceof Error ? err.message : 'the request to Resend failed',
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new MailDeliveryError(`Resend returned ${response.status}${body ? `: ${body}` : ''}`);
    }
  }
}
