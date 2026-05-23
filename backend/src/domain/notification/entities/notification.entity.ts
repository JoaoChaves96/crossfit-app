import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('notifications')
@Index(['userId', 'read'])
@Index(['userId', 'createdAt'])
@Index(['gymId'])
export class NotificationEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  gymId: string;

  @Column({
    type: 'varchar',
    enum: [
      'booking_confirmed',
      'waitlist_promoted',
      'class_cancelled',
      'class_changed',
      'class_reminder',
    ],
  })
  type:
    | 'booking_confirmed'
    | 'waitlist_promoted'
    | 'class_cancelled'
    | 'class_changed'
    | 'class_reminder';

  @Column('varchar')
  title: string;

  @Column('varchar')
  body: string;

  @Column('jsonb', { default: {} })
  data: Record<string, string>;

  @Column('boolean', { default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
