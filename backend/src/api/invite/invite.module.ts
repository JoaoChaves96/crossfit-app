import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InviteEntity } from '../../domain/invite/entities/invite.entity';
import { GymMembershipEntity } from '../../domain/gym-membership/entities/gym-membership.entity';
import { GymStaffModule } from '../../domain/gym-staff/gym-staff.module';
import { GymMembershipRepository } from '../../repositories/gym-membership.repository';
import { InviteService } from '../../domain/invite/invite.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InviteEntity, GymMembershipEntity]),
    GymStaffModule,
  ],
  providers: [
    InviteService,
    GymMembershipRepository,
  ],
  exports: [InviteService],
})
export class InviteModule {}
