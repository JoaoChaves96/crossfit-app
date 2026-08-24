import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordChangeService } from './password-change.service';
import { UserEntity } from '../user/entities/user.entity';
import { PasswordChangedMailer } from '../../infrastructure/mail/password-changed-mailer';
import { MailDeliveryError } from '../../infrastructure/mail/mail.types';

describe('PasswordChangeService', () => {
  let service: PasswordChangeService;

  const users = { findOne: jest.fn(), update: jest.fn() };
  const mailer = { sendPasswordChangedEmail: jest.fn() };

  /** A real bcrypt hash, so verification is exercised rather than stubbed. */
  let currentHash: string;

  // Loose overrides on purpose: `name` and `passwordHash` are typed
  // non-nullable on the entity but really are nullable in the database, which is
  // exactly what two of the cases below exercise.
  function userRow(
    overrides: Partial<Record<keyof UserEntity, unknown>> = {},
  ): UserEntity {
    return {
      id: 'user-1',
      email: 'jane@example.com',
      name: 'Jane Doe',
      passwordHash: currentHash,
      ...overrides,
    } as UserEntity;
  }

  /** The value written by the single `update` call. */
  function written(): Record<string, unknown> {
    expect(users.update).toHaveBeenCalledTimes(1);
    return users.update.mock.calls[0][1] as Record<string, unknown>;
  }

  beforeAll(async () => {
    currentHash = await bcrypt.hash('current-password', 10);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    users.findOne.mockResolvedValue(userRow());
    users.update.mockResolvedValue({ affected: 1 });
    mailer.sendPasswordChangedEmail.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        PasswordChangeService,
        { provide: getRepositoryToken(UserEntity), useValue: users },
        { provide: PasswordChangedMailer, useValue: mailer },
      ],
    }).compile();

    service = moduleRef.get(PasswordChangeService);
  });

  it('stores a hash of the new password, never the plaintext', async () => {
    await service.changePassword('user-1', 'current-password', 'brand-new-pw');

    const patch = written();
    expect(patch.passwordHash).not.toBe('brand-new-pw');
    await expect(
      bcrypt.compare('brand-new-pw', patch.passwordHash as string),
    ).resolves.toBe(true);
  });

  it('scopes the write to the caller from the token, not to an email in the body', async () => {
    await service.changePassword('user-1', 'current-password', 'brand-new-pw');

    expect(users.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ passwordHash: expect.any(String) }),
    );
    expect(users.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });

  it('rejects a wrong current password and writes nothing', async () => {
    await expect(
      service.changePassword('user-1', 'not-the-password', 'brand-new-pw'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(users.update).not.toHaveBeenCalled();
    expect(mailer.sendPasswordChangedEmail).not.toHaveBeenCalled();
  });

  it('rejects a new password equal to the current one', async () => {
    await expect(
      service.changePassword('user-1', 'current-password', 'current-password'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(users.update).not.toHaveBeenCalled();
    expect(mailer.sendPasswordChangedEmail).not.toHaveBeenCalled();
  });

  it('rejects an account with no password rather than crashing bcrypt on a null', async () => {
    users.findOne.mockResolvedValue(userRow({ passwordHash: null }));

    await expect(
      service.changePassword('user-1', 'current-password', 'brand-new-pw'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(users.update).not.toHaveBeenCalled();
  });

  it('rejects a token whose user no longer exists', async () => {
    users.findOne.mockResolvedValue(null);

    await expect(
      service.changePassword('user-1', 'current-password', 'brand-new-pw'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(users.update).not.toHaveBeenCalled();
  });

  it('notifies the account holder after a successful change', async () => {
    await service.changePassword('user-1', 'current-password', 'brand-new-pw');

    expect(mailer.sendPasswordChangedEmail).toHaveBeenCalledWith({
      email: 'jane@example.com',
      recipientName: 'Jane Doe',
    });
  });

  it('mails a nameless user without inventing a name', async () => {
    users.findOne.mockResolvedValue(userRow({ name: null }));

    await service.changePassword('user-1', 'current-password', 'brand-new-pw');

    expect(mailer.sendPasswordChangedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ recipientName: null }),
    );
  });

  // The change is already committed by the time the mail is attempted. Raising
  // here would report failure for a password that really did change, and the
  // user would go on believing the old one still works.
  it('succeeds even when the notification cannot be delivered', async () => {
    mailer.sendPasswordChangedEmail.mockRejectedValue(
      new MailDeliveryError('smtp exploded'),
    );

    await expect(
      service.changePassword('user-1', 'current-password', 'brand-new-pw'),
    ).resolves.toBeUndefined();

    expect(users.update).toHaveBeenCalledTimes(1);
  });
});
