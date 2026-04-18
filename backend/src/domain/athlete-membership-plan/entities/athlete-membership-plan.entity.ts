import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToOne,
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

  // Relationships
  @OneToOne(() => GymMembershipEntity, (gm) => gm.activeMembershipPlan)
  @JoinColumn({ name: 'gymMembershipId' })
  gymMembership: GymMembershipEntity;

  @ManyToOne(() => MembershipPlanEntity, (plan) => plan.athleteMemberships)
  @JoinColumn({ name: 'membershipPlanId' })
  membershipPlan: MembershipPlanEntity;
}
