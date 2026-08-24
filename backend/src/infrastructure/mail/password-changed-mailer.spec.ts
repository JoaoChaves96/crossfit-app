import { Test } from '@nestjs/testing';
import { PasswordChangedMailer } from './password-changed-mailer';
import { MAIL_DRIVER_TOKEN, MailDeliveryError } from './mail.types';

describe('PasswordChangedMailer', () => {
  const send = jest.fn();

  async function build(): Promise<PasswordChangedMailer> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PasswordChangedMailer,
        { provide: MAIL_DRIVER_TOKEN, useValue: { send } },
      ],
    }).compile();
    return moduleRef.get(PasswordChangedMailer);
  }

  const input = {
    email: 'jane@example.com',
    recipientName: 'Jane Doe',
  };

  beforeEach(() => send.mockReset());

  it('sends the rendered message to the account holder', async () => {
    send.mockResolvedValue(undefined);
    const mailer = await build();

    await mailer.sendPasswordChangedEmail(input);

    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0][0];
    expect(message.to).toBe('jane@example.com');
    expect(message.subject).toBe('Your BoxOps password was changed');
    expect(message.html).toContain('Jane Doe');
    expect(message.text).toContain('Jane Doe');
  });

  it('carries no link — a security notice must not be click-shaped', async () => {
    send.mockResolvedValue(undefined);
    const mailer = await build();

    await mailer.sendPasswordChangedEmail(input);

    const message = send.mock.calls[0][0];
    expect(message.html).not.toContain('<a ');
    expect(message.html).not.toContain('http');
    expect(message.text).not.toContain('http');
  });

  it('sets no replyTo — there is no human sender to reply to', async () => {
    send.mockResolvedValue(undefined);
    const mailer = await build();

    await mailer.sendPasswordChangedEmail(input);

    expect(send.mock.calls[0][0].replyTo).toBeUndefined();
  });

  it('lets a delivery failure through — the caller swallows it', async () => {
    send.mockRejectedValue(new MailDeliveryError('401 unauthorized'));
    const mailer = await build();

    await expect(mailer.sendPasswordChangedEmail(input)).rejects.toThrow(
      MailDeliveryError,
    );
  });
});
