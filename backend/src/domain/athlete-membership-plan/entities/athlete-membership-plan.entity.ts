import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { GymMembershipEntity } from '../../gym-membership/entities/gym-membership.entity';
import { MembershipPlanEntity } from '../../membership-plan/entities/membership-plan.entity';

@Entity('athlete_membership_plans')
@Index(['gymMembershipId', 'status'])
export class AthleteMembershipPlanEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  gymMembershipId: string;

  @Column('uuid')
  membershipPlanId: string;

  @Column({
    type: 'varchar',
    enum: ['active', 'expired'],
    default: 'active',
  })
  status: 'active' | 'expired';

  @CreateDateColumn()
  startedAt: Date;

  @Column('timestamp', { nullable: true })
  expiresAt: Date | null;

  @Column('boolean', { default: true })
  autoRoll: boolean;

  @Column('integer', { default: 0 })
  autoRollCount: number;

  // Relationships
  // ManyToOne, not OneToOne: a membership accumulates plan rows over time
  // (append-only history), at most one of which is status 'active'. A OneToOne
  // here would emit a UNIQUE("gymMembershipId") and break expire-then-create.
  @ManyToOne(() => GymMembershipEntity, (gm) => gm.membershipPlans)
  @JoinColumn({ name: 'gymMembershipId' })
  gymMembership: GymMembershipEntity;

  @ManyToOne(() => MembershipPlanEntity, (plan) => plan.athleteMemberships)
  @JoinColumn({ name: 'membershipPlanId' })
  membershipPlan: MembershipPlanEntity;
}
