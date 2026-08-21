import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository, IsNull } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuid } from 'uuid';
import * as bcrypt from 'bcrypt';
import { PasswordResetTokenEntity } from './entities/password-reset-token.entity';
import { UserEntity } from '../user/entities/user.entity';
import { AuthService } from './auth.service';
import { PasswordResetMailer } from '../../infrastructure/mail/password-reset-mailer';

const TOKEN_BYTE_LENGTH = 32;
const RESET_TOKEN_TTL_MINUTES = 60;
const RESET_THROTTLE_MINUTES = 15;

/** One indistinguishable message for unknown, expired and already-used alike:
 *  telling them apart tells an attacker which tokens have existed. */
const INVALID_TOKEN_MESSAGE = 'This reset link is no longer valid.';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @InjectRepository(PasswordResetTokenEntity)
    private readonly tokenRepository: Repository<PasswordResetTokenEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly mailer: PasswordResetMailer,
    private readonly authService: AuthService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Request a reset link.
   *
   * Returns void on every path — unknown address, throttled, delivered, failed.
   * The caller is an anonymous stranger, so any variation in the response is an
   * account-enumeration oracle, and `failed` would tell them nothing they could
   * act on (unlike an invite, where the owner can copy the link).
   */
  async requestReset(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      return;
    }

    // Per-email throttle. The rows we already write are the record, so this
    // needs no dependency and no shared store — which matters because staging
    // runs two Fly machines and an in-memory counter would cap at 2x the rate.
    const recentCutoff = new Date(
      Date.now() - RESET_THROTTLE_MINUTES * 60 * 1000,
    );
    const recent = await this.tokenRepository.count({
      where: {
        userId: user.id,
        usedAt: IsNull(),
        createdAt: MoreThan(recentCutoff),
      },
    });
    if (recent > 0) {
      return;
    }

    const token = randomBytes(TOKEN_BYTE_LENGTH)
      .toString('base64url')
      .slice(0, 43);

    const expiresAt = new Date(
      Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000,
    );

    const row = new PasswordResetTokenEntity();
    row.id = uuid();
    row.userId = user.id;
    row.tokenHash = this.hashToken(token);
    row.expiresAt = expiresAt;
    row.usedAt = null;
    // Set from the app clock, never left to the column's `DEFAULT now()`, which
    // is the database clock: the throttle above compares `createdAt` against a
    // cutoff computed here, and a naive `timestamp` column stores whatever zone
    // wrote it. Mixing the two silently disables the throttle wherever the app
    // is not running in UTC. Every other write path in this codebase sets
    // `createdAt` explicitly for the same reason.
    row.createdAt = new Date();

    await this.tokenRepository.save(row);

    await this.deliver(user, token, expiresAt);
  }

  async isTokenValid(token: string): Promise<boolean> {
    return (await this.findUsableRow(token)) !== null;
  }

  async resetPassword(token: string, newPassword: string): Promise<string> {
    const row = await this.findUsableRow(token);
    if (!row) {
      throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    }

    const user = await this.userRepository.findOne({
      where: { id: row.userId },
    });
    if (!user) {
      throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // One transaction for both writes. Split, the failure between them leaves
    // the account on the new password with the token still unused — a
    // single-use credential that the mailbox holder can replay, which is the
    // one property this feature exists to guarantee. Hashing happens before
    // the transaction opens: bcrypt at cost 10 is ~100ms and nothing about it
    // needs to hold a connection.
    await this.dataSource.transaction(async (manager) => {
      await manager.update(UserEntity, user.id, { passwordHash });
      await manager.update(PasswordResetTokenEntity, row.id, {
        usedAt: new Date(),
      });
    });

    // Through AuthService, never jwtService.sign: the claims' gym/role
    // resolution must be byte-identical to what login produces.
    return this.authService.issueTokenForUser(user.id);
  }

  /**
   * Delivery. MUST NOT throw: the row is already persisted, and the caller
   * must not learn whether the send worked. Mirrors
   * InviteService.announceInviteLink, minus the returned status.
   */
  private async deliver(
    user: UserEntity,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    try {
      await this.mailer.sendPasswordResetEmail({
        email: user.email,
        recipientName: user.name ?? null,
        resetLink: this.buildResetLink(token),
        expiresAt,
      });
    } catch (err) {
      // The address, never the token: a log line carrying the plaintext would
      // put an account-takeover credential into log storage.
      this.logger.warn(
        `Password reset for ${user.email} was requested but NOT delivered: ` +
          `${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async findUsableRow(
    token: string,
  ): Promise<PasswordResetTokenEntity | null> {
    const row = await this.tokenRepository.findOne({
      where: { tokenHash: this.hashToken(token) },
    });
    if (!row) return null;
    if (row.usedAt !== null) return null;
    if (new Date() > row.expiresAt) return null;
    return row;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * The single place a reset link is composed, mirroring
   * InviteService.buildInviteLink. The fallback is localhost, not a
   * plausible-looking domain: a link that looks correct and goes nowhere fails
   * silently, and every deployed environment sets FRONTEND_URL.
   */
  private buildResetLink(token: string): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
    return `${frontendUrl}/reset-password/${token}`;
  }
}
