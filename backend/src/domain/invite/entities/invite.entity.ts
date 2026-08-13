import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type InviteRole = 'athlete' | 'coach';

@Entity('invites')
@Index(['inviteToken'], { unique: true })
@Index(['gymId', 'inviteeEmail'])
export class InviteEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  gymId: string;

  @Column('uuid')
  createdByUserId: string;

  @Column('varchar')
  inviteeEmail: string;

  @Column('varchar', { unique: true })
  inviteToken: string;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date | null;

  @Column('uuid', { nullable: true })
  acceptedByUserId: string | null;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({
    type: 'varchar',
    enum: ['pending', 'accepted', 'expired', 'revoked'],
    default: 'pending',
  })
  status: InviteStatus;

  /**
   * What accepting this invite makes the invitee.
   *
   * 'athlete' creates a gym_membership; 'coach' creates a gym_staff row.
   * Defaults to 'athlete' so every pre-existing row is correct without a
   * backfill — coach invites did not exist before this column.
   */
  @Column({
    type: 'varchar',
    enum: ['athlete', 'coach'],
    default: 'athlete',
  })
  role: InviteRole;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
