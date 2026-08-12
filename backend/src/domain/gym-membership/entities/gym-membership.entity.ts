import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  OneToMany,
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

  /**
   * Full plan history for this membership, newest and oldest alike. It is NOT
   * "the current plan": the current plan is the row with status 'active', and
   * asking this relation for it would happily hand back an expired row.
   * Read the current plan via
   * AthleteMembershipPlanRepository.getActivePlanByGymMembership, which filters
   * on status.
   */
  @OneToMany(() => AthleteMembershipPlanEntity, (plan) => plan.gymMembership)
  membershipPlans?: AthleteMembershipPlanEntity[];
}
