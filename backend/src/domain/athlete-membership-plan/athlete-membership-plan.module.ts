import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AthleteMembershipPlanEntity } from './entities/athlete-membership-plan.entity';
import { AthleteMembershipPlanRepository } from '../../repositories/athlete-membership-plan.repository';

/**
 * AthleteMembershipPlanModule: Manages athlete membership plan entities and repository
 *
 * Exports:
 * - AthleteMembershipPlanRepository (for command handlers)
 */
@Module({
  imports: [TypeOrmModule.forFeature([AthleteMembershipPlanEntity])],
  providers: [AthleteMembershipPlanRepository],
  exports: [AthleteMembershipPlanRepository],
})
export class AthleteMembershipPlanModule {}
