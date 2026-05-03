import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InviteEntity } from '../../domain/invite/entities/invite.entity';
import { GymMembershipEntity } from '../../domain/gym-membership/entities/gym-membership.entity';
import { GymStaffModule } from '../../domain/gym-staff/gym-staff.module';
import { GymMembershipRepository } from '../../repositories/gym-membership.repository';
import { InviteService } from './invite.service';
import { InviteController } from './invite.controller';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([InviteEntity, GymMembershipEntity]),
    GymStaffModule,
  ],
  controllers: [InviteController],
  providers: [
    InviteService,
    RolesGuard,
    GymMembershipRepository,
  ],
})
export class InviteModule {}
