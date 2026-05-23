import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GymEntity } from './entities/gym.entity';
import { GymStaffEntity } from '../gym-staff/entities/gym-staff.entity';
import { UserModule } from '../user/user.module';
import { CreateGymHandler } from '../../commands/gym/handlers/create-gym.handler';

@Module({
  imports: [
    CqrsModule,
    UserModule,
    TypeOrmModule.forFeature([GymEntity, GymStaffEntity]),
  ],
  providers: [CreateGymHandler],
})
export class GymFeatureModule {}
