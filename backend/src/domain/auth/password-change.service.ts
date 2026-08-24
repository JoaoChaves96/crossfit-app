import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../user/entities/user.entity';
import { PasswordChangedMailer } from '../../infrastructure/mail/password-changed-mailer';
import { hashPassword, verifyPassword } from './password-hashing';

/**
 * One message for a missing user, a passwordless account and a wrong current
 * password alike. The caller is already authenticated, so this is not an
 * enumeration defence — it is that none of the three is separately actionable:
 * in every case the password they typed is not the one on this account.
 */
const REJECTED_MESSAGE = 'Your current password is incorrect.';

/**
 * Its own service rather than a method on AuthService. AuthService is injected
 * across the app (CreateGymHandler, every guard-adjacent module) and adding a
 * mailer dependency to it would pull MailModule into all of them.
 */
@Injectable()
export class PasswordChangeService {
  private readonly logger = new Logger(PasswordChangeService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly mailer: PasswordChangedMailer,
  ) {}

  /**
   * `userId` comes from the verified token, never from the request body: that
   * is the whole tenant-safety story here, since there is no other scoping to
   * apply to a user-owned credential.
   *
   * No session is revoked, by decision — a change is not assumed to mean a
   * takeover, and the notification email is what makes a real one visible.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException(REJECTED_MESSAGE);
    }

    if (!(await verifyPassword(currentPassword, user.passwordHash ?? null))) {
      throw new BadRequestException(REJECTED_MESSAGE);
    }

    if (newPassword === currentPassword) {
      throw new BadRequestException(
        'Your new password must be different from your current one.',
      );
    }

    // A single write, unlike reset's user-plus-token pair, so there is nothing
    // for a transaction to keep consistent.
    await this.userRepository.update(user.id, {
      passwordHash: await hashPassword(newPassword),
    });

    await this.notify(user);
  }

  /**
   * MUST NOT throw. The password has already changed by the time this runs, so
   * raising here would report a failure for a change that stuck and leave the
   * user believing their old password still works.
   */
  private async notify(user: UserEntity): Promise<void> {
    try {
      await this.mailer.sendPasswordChangedEmail({
        email: user.email,
        recipientName: user.name ?? null,
      });
    } catch (err) {
      this.logger.warn(
        `Password for ${user.email} was changed but the notification was NOT ` +
          `delivered: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
