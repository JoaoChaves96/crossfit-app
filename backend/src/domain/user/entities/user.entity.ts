import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { GymMembershipEntity } from '../../gym-membership/entities/gym-membership.entity';

@Entity('users')
export class UserEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('varchar', { unique: true })
  email: string;

  @Column('varchar', { nullable: true })
  passwordHash: string | null;

  @Column('varchar', { nullable: true })
  socialLoginId: string | null;

  @Column('varchar')
  name: string;

  @Column({
    type: 'varchar',
    enum: ['active', 'inactive'],
    default: 'active',
  })
  status: 'active' | 'inactive';

  @Column('jsonb', {
    default: {
      booking_confirmations: true,
      waitlist_updates: true,
      class_changes: true,
      class_reminders: true,
    },
  })
  notificationPreferences: {
    booking_confirmations: boolean;
    waitlist_updates: boolean;
    class_changes: boolean;
    class_reminders: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;

  // Relationships
  @OneToMany(() => GymMembershipEntity, (gm) => gm.user)
  gymMemberships: GymMembershipEntity[];
}
