import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetTokenEntity } from './entities/password-reset-token.entity';
import { UserEntity } from '../user/entities/user.entity';
import { AuthService } from './auth.service';
import { PasswordResetMailer } from '../../infrastructure/mail/password-reset-mailer';
import { MailDeliveryError } from '../../infrastructure/mail/mail.types';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('PasswordResetService', () => {
  let service: PasswordResetService;

  const users = { findOne: jest.fn(), save: jest.fn() };
  const tokens = { findOne: jest.fn(), save: jest.fn(), count: jest.fn() };
  const mailer = { sendPasswordResetEmail: jest.fn() };
  const auth = { issueTokenForUser: jest.fn() };

  // Runs the callback inline against a stub manager: this proves the writes go
  // through one transaction, while whether that transaction is atomic is a
  // database property and belongs to the e2e suite.
  const manager = { update: jest.fn() };
  const dataSource = {
    transaction: jest.fn(
      (run: (m: EntityManager) => Promise<unknown>) =>
        run(manager as unknown as EntityManager) as Promise<unknown>,
    ),
  };

  /** The value written for one entity inside the transaction. */
  function updatedWith(entity: unknown): Record<string, unknown> {
    const call = manager.update.mock.calls.find(([target]) => target === entity);
    if (!call) throw new Error('no transactional update for that entity');
    return call[2] as Record<string, unknown>;
  }

  const user = {
    id: 'user-1',
    email: 'jane@example.com',
    name: 'Jane Doe',
    passwordHash: 'old-hash',
  } as UserEntity;

  beforeEach(async () => {
    jest.clearAllMocks();
    tokens.count.mockResolvedValue(0);
    tokens.save.mockImplementation((row) => Promise.resolve(row));
    users.findOne.mockResolvedValue(null);
    users.save.mockImplementation((u) => Promise.resolve(u));
    mailer.sendPasswordResetEmail.mockResolvedValue(undefined);
    auth.issueTokenForUser.mockResolvedValue('signed.jwt.token');

    const moduleRef = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        {
          provide: getRepositoryToken(PasswordResetTokenEntity),
          useValue: tokens,
        },
        { provide: getRepositoryToken(UserEntity), useValue: users },
        { provide: PasswordResetMailer, useValue: mailer },
        { provide: AuthService, useValue: auth },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(PasswordResetService);
  });

  describe('requestReset', () => {
    it('mints no token and sends no mail for an unknown address', async () => {
      users.findOne.mockResolvedValue(null);

      await expect(
        service.requestReset('nobody@example.com'),
      ).resolves.toBeUndefined();

      expect(tokens.save).not.toHaveBeenCalled();
      expect(mailer.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('persists only a hash of the token, never the token itself', async () => {
      users.findOne.mockResolvedValue(user);

      await service.requestReset(user.email);

      const saved = tokens.save.mock.calls[0][0];
      const sentLink = mailer.sendPasswordResetEmail.mock.calls[0][0].resetLink;
      const plaintext = sentLink.split('/').pop() as string;

      expect(saved.tokenHash).toBe(sha256(plaintext));
      expect(saved.tokenHash).not.toBe(plaintext);
      expect(JSON.stringify(saved)).not.toContain(plaintext);
    });

    it('expires the token an hour out and leaves usedAt null', async () => {
      users.findOne.mockResolvedValue(user);
      const before = Date.now();

      await service.requestReset(user.email);

      const saved = tokens.save.mock.calls[0][0];
      const ttlMs = saved.expiresAt.getTime() - before;
      expect(ttlMs).toBeGreaterThan(59 * 60 * 1000);
      expect(ttlMs).toBeLessThanOrEqual(60 * 60 * 1000 + 5000);
      expect(saved.usedAt).toBeNull();
      expect(saved.userId).toBe(user.id);
    });

    it('sends no mail when a recent unused token already exists', async () => {
      users.findOne.mockResolvedValue(user);
      tokens.count.mockResolvedValue(1);

      await service.requestReset(user.email);

      expect(tokens.save).not.toHaveBeenCalled();
      expect(mailer.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('builds the link from FRONTEND_URL', async () => {
      users.findOne.mockResolvedValue(user);
      const previous = process.env.FRONTEND_URL;
      process.env.FRONTEND_URL = 'https://app.boxops.dev';
      try {
        await service.requestReset(user.email);
        const link = mailer.sendPasswordResetEmail.mock.calls[0][0].resetLink;
        expect(link).toMatch(/^https:\/\/app\.boxops\.dev\/reset-password\/.+/);
      } finally {
        process.env.FRONTEND_URL = previous;
      }
    });

    it('swallows a delivery failure — the caller must not learn of it', async () => {
      users.findOne.mockResolvedValue(user);
      mailer.sendPasswordResetEmail.mockRejectedValue(
        new MailDeliveryError('403 unverified sender'),
      );

      await expect(service.requestReset(user.email)).resolves.toBeUndefined();
      // The row survives: the link may still be delivered by another route.
      expect(tokens.save).toHaveBeenCalled();
    });
  });

  describe('isTokenValid', () => {
    it('is true for an unused, unexpired token', async () => {
      tokens.findOne.mockResolvedValue({
        id: 'row-1',
        userId: user.id,
        tokenHash: sha256('plain'),
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      });

      await expect(service.isTokenValid('plain')).resolves.toBe(true);
    });

    it('looks the row up by hash, not by the plaintext token', async () => {
      tokens.findOne.mockResolvedValue(null);

      await service.isTokenValid('plain');

      expect(tokens.findOne).toHaveBeenCalledWith({
        where: { tokenHash: sha256('plain') },
      });
    });

    it('is false for an unknown token', async () => {
      tokens.findOne.mockResolvedValue(null);
      await expect(service.isTokenValid('plain')).resolves.toBe(false);
    });

    it('is false for an expired token', async () => {
      tokens.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1),
        usedAt: null,
      });
      await expect(service.isTokenValid('plain')).resolves.toBe(false);
    });

    it('is false for an already-used token', async () => {
      tokens.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: new Date(),
      });
      await expect(service.isTokenValid('plain')).resolves.toBe(false);
    });
  });

  describe('resetPassword', () => {
    function validRow() {
      return {
        id: 'row-1',
        userId: user.id,
        tokenHash: sha256('plain'),
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      };
    }

    it('stores a new bcrypt hash and returns a token from AuthService', async () => {
      tokens.findOne.mockResolvedValue(validRow());
      users.findOne.mockResolvedValue({ ...user });

      const jwt = await service.resetPassword('plain', 'brand-new-password');

      expect(jwt).toBe('signed.jwt.token');
      expect(auth.issueTokenForUser).toHaveBeenCalledWith(user.id);

      const { passwordHash } = updatedWith(UserEntity);
      expect(passwordHash).not.toBe('old-hash');
      await expect(
        bcrypt.compare('brand-new-password', passwordHash as string),
      ).resolves.toBe(true);
    });

    it('marks the token used so it cannot be replayed', async () => {
      tokens.findOne.mockResolvedValue(validRow());
      users.findOne.mockResolvedValue({ ...user });

      await service.resetPassword('plain', 'brand-new-password');

      expect(updatedWith(PasswordResetTokenEntity).usedAt).toBeInstanceOf(Date);
    });

    it('writes the new hash and the used marker in one transaction', async () => {
      tokens.findOne.mockResolvedValue(validRow());
      users.findOne.mockResolvedValue({ ...user });

      await service.resetPassword('plain', 'brand-new-password');

      // A password changed with the token still replayable is the one state
      // this feature must never leave behind, so both writes share a unit.
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(manager.update).toHaveBeenCalledTimes(2);
      expect(users.save).not.toHaveBeenCalled();
      expect(tokens.save).not.toHaveBeenCalled();
    });

    it.each([
      ['unknown', null],
      [
        'expired',
        {
          ...{ id: 'r', userId: 'user-1', tokenHash: 'h' },
          expiresAt: new Date(Date.now() - 1),
          usedAt: null,
        },
      ],
      [
        'used',
        {
          ...{ id: 'r', userId: 'user-1', tokenHash: 'h' },
          expiresAt: new Date(Date.now() + 60_000),
          usedAt: new Date(),
        },
      ],
    ])(
      'rejects a %s token with one indistinguishable message',
      async (_label, row) => {
        tokens.findOne.mockResolvedValue(row);

        await expect(
          service.resetPassword('plain', 'whatever'),
        ).rejects.toThrow(
          new BadRequestException('This reset link is no longer valid.'),
        );
      },
    );

    it('rejects when the token is valid but its user has vanished', async () => {
      tokens.findOne.mockResolvedValue(validRow());
      users.findOne.mockResolvedValue(null);

      await expect(service.resetPassword('plain', 'whatever')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
