import { InviteMailer } from './invite-mailer';
import { MailDriver, MailMessage } from './mail.types';

const INPUT = {
  role: 'athlete' as const,
  inviteeEmail: 'dana@example.com',
  gymName: 'Box One',
  inviterName: 'Olive Owner',
  inviterEmail: 'olive@example.com',
  inviteLink: 'https://app.boxops.dev/invite/tok-abc',
  expiresAt: new Date('2026-08-28T10:00:00.000Z'),
};

describe('InviteMailer', () => {
  let sent: MailMessage[];
  let driver: MailDriver;

  beforeEach(() => {
    sent = [];
    driver = {
      send: async (message) => {
        sent.push(message);
      },
    };
  });

  it('sends the rendered invite to the invitee, replying to the inviter', async () => {
    await new InviteMailer(driver).sendInviteEmail(INPUT);

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('dana@example.com');
    expect(sent[0].replyTo).toBe('olive@example.com');
    expect(sent[0].subject).toBe("You're invited to join Box One on BoxOps");
    expect(sent[0].html).toContain('https://app.boxops.dev/invite/tok-abc');
    expect(sent[0].text).toContain('Olive Owner');
  });

  it('omits the reply address when the inviter has no resolvable email', async () => {
    await new InviteMailer(driver).sendInviteEmail({
      ...INPUT,
      inviterName: null,
      inviterEmail: null,
    });

    expect(sent[0].replyTo).toBeUndefined();
  });

  it('propagates a driver failure so the caller can report it', async () => {
    const failing: MailDriver = {
      send: async () => {
        throw new Error('boom');
      },
    };

    await expect(new InviteMailer(failing).sendInviteEmail(INPUT)).rejects.toThrow('boom');
  });
});
