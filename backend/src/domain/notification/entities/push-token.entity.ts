import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('push_tokens')
@Index(['userId'])
@Index(['token'], { unique: true })
export class PushTokenEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('varchar')
  token: string;

  @Column({
    type: 'varchar',
    enum: ['ios', 'android', 'web'],
  })
  platform: 'ios' | 'android' | 'web';

  @CreateDateColumn()
  createdAt: Date;
}
