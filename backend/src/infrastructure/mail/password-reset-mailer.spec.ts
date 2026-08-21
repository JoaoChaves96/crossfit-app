import { Test } from '@nestjs/testing';
import { PasswordResetMailer } from './password-reset-mailer';
import { MAIL_DRIVER_TOKEN, MailDeliveryError } from './mail.types';

describe('PasswordResetMailer', () => {
  const send = jest.fn();

  async function build(): Promise<PasswordResetMailer> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PasswordResetMailer,
        { provide: MAIL_DRIVER_TOKEN, useValue: { send } },
      ],
    }).compile();
    return moduleRef.get(PasswordResetMailer);
  }

  const input = {
    email: 'jane@example.com',
    recipientName: 'Jane Doe',
    resetLink: 'https://app.boxops.dev/reset-password/abc123',
    expiresAt: new Date('2026-09-01T12:00:00.000Z'),
  };

  beforeEach(() => send.mockReset());

  it('sends the rendered message to the requesting address', async () => {
    send.mockResolvedValue(undefined);
    const mailer = await build();

    await mailer.sendPasswordResetEmail(input);

    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0][0];
    expect(message.to).toBe('jane@example.com');
    expect(message.subject).toBe('Reset your BoxOps password');
    expect(message.html).toContain(input.resetLink);
    expect(message.text).toContain(input.resetLink);
  });

  it('sets no replyTo — there is no human sender to reply to', async () => {
    send.mockResolvedValue(undefined);
    const mailer = await build();

    await mailer.sendPasswordResetEmail(input);

    expect(send.mock.calls[0][0].replyTo).toBeUndefined();
  });

  it('lets a delivery failure through — the caller turns it into a status', async () => {
    send.mockRejectedValue(new MailDeliveryError('401 unauthorized'));
    const mailer = await build();

    await expect(mailer.sendPasswordResetEmail(input)).rejects.toThrow(
      MailDeliveryError,
    );
  });
});
