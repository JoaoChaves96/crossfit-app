import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { GymStaffEntity } from '../../gym-staff/entities/gym-staff.entity';
import { ClassTypeEntity } from '../../class-type/entities/class-type.entity';
import { MembershipPlanEntity } from '../../membership-plan/entities/membership-plan.entity';
import { SpaceEntity } from '../../space/entities/space.entity';
import { ClassEntity } from '../../class/entities/class.entity';
import { GymMembershipEntity } from '../../gym-membership/entities/gym-membership.entity';

@Entity('gyms')
export class GymEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('varchar')
  name: string;

  @Column('varchar', { nullable: true })
  description: string | null;

  @Column('varchar')
  location: string;

  @Column('varchar', { nullable: true })
  logoUrl: string | null;

  @Column('uuid')
  ownerUserId: string;

  @Column({
    type: 'varchar',
    enum: ['active', 'pending_approval', 'suspended'],
    default: 'pending_approval',
  })
  status: 'active' | 'pending_approval' | 'suspended';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastModifiedAt: Date;

  // Relationships
  @OneToMany(() => GymStaffEntity, (staff) => staff.gym)
  staff: GymStaffEntity[];

  @OneToMany(() => ClassTypeEntity, (classType) => classType.gym)
  classTypes: ClassTypeEntity[];

  @OneToMany(() => MembershipPlanEntity, (plan) => plan.gym)
  membershipPlans: MembershipPlanEntity[];

  @OneToMany(() => SpaceEntity, (space) => space.gym)
  spaces: SpaceEntity[];

  @OneToMany(() => ClassEntity, (cls) => cls.gym)
  classes: ClassEntity[];

  @OneToMany(() => GymMembershipEntity, (gm) => gm.gym)
  gymMemberships: GymMembershipEntity[];
}
