import { ResendDriver } from './resend.driver';
import { MailDeliveryError, MailMessage } from './mail.types';

const MESSAGE: MailMessage = {
  to: 'dana@example.com',
  subject: 'You are invited',
  html: '<p>hi</p>',
  text: 'hi',
  replyTo: 'owner@example.com',
};

describe('ResendDriver', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('posts the message to the Resend API and resolves on 200', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '{}' });

    await new ResendDriver('re_test_key', 'BoxOps <invites@mail.boxops.dev>').send(MESSAGE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer re_test_key');
    const body = JSON.parse(init.body as string);
    expect(body.from).toBe('BoxOps <invites@mail.boxops.dev>');
    expect(body.to).toEqual(['dana@example.com']);
    expect(body.subject).toBe('You are invited');
    expect(body.html).toBe('<p>hi</p>');
    expect(body.text).toBe('hi');
    // Resend's field is snake_case; sending replyTo would silently drop it.
    expect(body.reply_to).toBe('owner@example.com');
  });

  it('omits reply_to entirely when there is no reply address', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '{}' });

    await new ResendDriver('k', 'from@example.com').send({ ...MESSAGE, replyTo: undefined });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect('reply_to' in body).toBe(false);
  });

  it('throws MailDeliveryError carrying the status and the provider body on a non-2xx', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"message":"API key is invalid"}',
    });

    await expect(new ResendDriver('bad', 'from@example.com').send(MESSAGE)).rejects.toThrow(
      MailDeliveryError,
    );
    await expect(new ResendDriver('bad', 'from@example.com').send(MESSAGE)).rejects.toThrow(
      /401.*API key is invalid/,
    );
  });

  it('throws MailDeliveryError when the request itself fails', async () => {
    fetchMock.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

    await expect(new ResendDriver('k', 'from@example.com').send(MESSAGE)).rejects.toThrow(
      /getaddrinfo ENOTFOUND/,
    );
  });
});
