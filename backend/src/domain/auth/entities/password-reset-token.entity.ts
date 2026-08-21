import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * A single password-reset request.
 *
 * `tokenHash` is sha256(token) hex — the plaintext token exists exactly once,
 * in the email. This deliberately diverges from InviteEntity.inviteToken, which
 * is stored in plaintext: an invite grants membership of one gym an owner can
 * revoke, while this grants the account itself, so a leaked database dump must
 * not be replayable.
 *
 * No status enum. Unlike an invite there is nothing to display and no lifecycle
 * to report — `expiresAt` and `usedAt` answer everything there is to ask.
 */
@Entity('password_reset_tokens')
@Index(['tokenHash'], { unique: true })
@Index(['userId'])
export class PasswordResetTokenEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('varchar', { unique: true })
  tokenHash: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
