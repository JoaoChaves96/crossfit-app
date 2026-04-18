import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GymMembershipEntity } from './entities/gym-membership.entity';
import { GymMembershipRepository } from '../../repositories/gym-membership.repository';

/**
 * GymMembershipModule: Manages gym membership entities and repository
 *
 * Exports:
 * - GymMembershipRepository (for command handlers)
 */
@Module({
  imports: [TypeOrmModule.forFeature([GymMembershipEntity])],
  providers: [GymMembershipRepository],
  exports: [GymMembershipRepository],
})
export class GymMembershipModule {}
