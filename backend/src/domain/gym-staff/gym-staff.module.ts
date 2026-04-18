import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GymStaffEntity } from './entities/gym-staff.entity';
import { GymStaffService } from './gym-staff.service';

@Module({
  imports: [TypeOrmModule.forFeature([GymStaffEntity])],
  providers: [GymStaffService],
  exports: [GymStaffService],
})
export class GymStaffModule {}
