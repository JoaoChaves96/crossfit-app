import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  OneToOne,
} from 'typeorm';
import { GymEntity } from '../../gym/entities/gym.entity';
import { UserEntity } from '../../user/entities/user.entity';
import { AthleteMembershipPlanEntity } from '../../athlete-membership-plan/entities/athlete-membership-plan.entity';

@Entity('gym_memberships')
@Index(['gymId', 'userId'])
@Index(['userId', 'status'])
export class GymMembershipEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  gymId: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'varchar',
    enum: ['active', 'inactive'],
    default: 'active',
  })
  status: 'active' | 'inactive';

  @CreateDateColumn()
  joinedAt: Date;

  // Relationships
  @ManyToOne(() => GymEntity, (gym) => gym.gymMemberships)
  @JoinColumn({ name: 'gymId' })
  gym: GymEntity;

  @ManyToOne(() => UserEntity, (user) => user.gymMemberships)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @OneToOne(() => AthleteMembershipPlanEntity, (plan) => plan.gymMembership)
  activeMembershipPlan?: AthleteMembershipPlanEntity | null;
}
