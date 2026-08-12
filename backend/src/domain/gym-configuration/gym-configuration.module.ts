import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpaceEntity } from '../space/entities/space.entity';
import { ClassTypeEntity } from '../class-type/entities/class-type.entity';
import { MembershipPlanEntity } from '../membership-plan/entities/membership-plan.entity';
import { GymMembershipEntity } from '../gym-membership/entities/gym-membership.entity';
import { AthleteMembershipPlanEntity } from '../athlete-membership-plan/entities/athlete-membership-plan.entity';
import { GymStaffEntity } from '../gym-staff/entities/gym-staff.entity';
import { UserEntity } from '../user/entities/user.entity';
import { ClassEntity } from '../class/entities/class.entity';
import { BookingEntity } from '../booking/entities/booking.entity';
import { GymModule } from '../gym/gym.module';
import { GymStaffService } from '../gym-staff/gym-staff.service';
import { SpaceService } from '../space/space.service';
import { ClassTypeService } from '../class-type/class-type.service';

// Command Handlers
import { CreateSpaceHandler } from '../../commands/gym-configuration/handlers/create-space.handler';
import { UpdateSpaceHandler } from '../../commands/gym-configuration/handlers/update-space.handler';
import { DeleteSpaceHandler } from '../../commands/gym-configuration/handlers/delete-space.handler';
import { ConfigureClassTypesHandler } from '../../commands/gym-configuration/handlers/configure-class-types.handler';
import { CreateMembershipPlanHandler } from '../../commands/gym-configuration/handlers/create-membership-plan.handler';
import { UpdateMembershipPlanHandler } from '../../commands/gym-configuration/handlers/update-membership-plan.handler';
import { ArchiveMembershipPlanHandler } from '../../commands/gym-configuration/handlers/archive-membership-plan.handler';
import { PurchaseMembershipPlanHandler } from '../../commands/gym-configuration/handlers/purchase-membership-plan.handler';
import { ManuallyAddMemberHandler } from '../../commands/gym-configuration/handlers/manually-add-member.handler';
import { InviteCoachHandler } from '../../commands/gym-configuration/handlers/invite-coach.handler';
import { ChangeCoachStatusHandler } from '../../commands/gym-configuration/handlers/change-coach-status.handler';
import { UpdateGymProfileHandler } from '../../commands/gym-configuration/handlers/update-gym-profile.handler';
import { ExtendMembershipHandler } from '../../commands/gym-configuration/handlers/extend-membership.handler';
import { GetGymProfileService } from '../../queries/gym-configuration/get-gym-profile.service';
import { CoachesQueryService } from '../../queries/gym-configuration/coaches.service';
import { ClassTypesQueryService } from '../../queries/gym-configuration/class-types.service';
import { SpacesQueryService } from '../../queries/gym-configuration/spaces.service';
import { GymMembersQueryService } from '../../queries/gym-configuration/gym-members.service';
import { MembershipPlansQueryService } from '../../queries/gym-configuration/membership-plans.service';

/**
 * GymConfigurationModule: Wires gym configuration and monetization commands
 *
 * This module:
 * - Imports CQRS for command handling
 * - Registers TypeORM entities
 * - Provides domain services (Gym, GymStaff, Space, ClassType)
 * - Registers all Phase 3 command handlers
 */
@Module({
  imports: [
    CqrsModule,
    GymModule,
    TypeOrmModule.forFeature([
      SpaceEntity,
      ClassTypeEntity,
      MembershipPlanEntity,
      GymMembershipEntity,
      AthleteMembershipPlanEntity,
      GymStaffEntity,
      UserEntity,
      ClassEntity,
      BookingEntity,
    ]),
  ],
  providers: [
    // Domain services
    GymStaffService,
    SpaceService,
    ClassTypeService,

    // Command handlers
    CreateSpaceHandler,
    UpdateSpaceHandler,
    DeleteSpaceHandler,
    ConfigureClassTypesHandler,
    CreateMembershipPlanHandler,
    UpdateMembershipPlanHandler,
    ArchiveMembershipPlanHandler,
    PurchaseMembershipPlanHandler,
    ManuallyAddMemberHandler,
    InviteCoachHandler,
    ChangeCoachStatusHandler,
    UpdateGymProfileHandler,
    ExtendMembershipHandler,

    // Query services
    GetGymProfileService,
    CoachesQueryService,
    ClassTypesQueryService,
    SpacesQueryService,
    GymMembersQueryService,
    MembershipPlansQueryService,
  ],
  exports: [
    GymStaffService,
    SpaceService,
    ClassTypeService,
    GetGymProfileService,
    CoachesQueryService,
    ClassTypesQueryService,
    SpacesQueryService,
    GymMembersQueryService,
    MembershipPlansQueryService,
  ],
})
export class GymConfigurationModule {}
