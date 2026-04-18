import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { GymEntity } from '../../gym/entities/gym.entity';
import { AthleteMembershipPlanEntity } from '../../athlete-membership-plan/entities/athlete-membership-plan.entity';

@Entity('membership_plans')
@Index(['gymId'])
export class MembershipPlanEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  gymId: string;

  @Column('varchar')
  name: string;

  @Column('integer')
  pricing: number;

  @Column({
    type: 'varchar',
    enum: ['monthly', 'annual'],
  })
  billingCycle: 'monthly' | 'annual';

  @Column('simple-array')
  classTypes: string[];

  @Column({
    type: 'varchar',
    enum: ['active', 'archived'],
    default: 'active',
  })
  status: 'active' | 'archived';

  @CreateDateColumn()
  createdAt: Date;

  // Relationships
  @ManyToOne(() => GymEntity, (gym) => gym.membershipPlans)
  @JoinColumn({ name: 'gymId' })
  gym: GymEntity;

  @OneToMany(() => AthleteMembershipPlanEntity, (amp) => amp.membershipPlan)
  athleteMemberships: AthleteMembershipPlanEntity[];
}
