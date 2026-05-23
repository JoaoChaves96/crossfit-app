import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

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

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
