import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GymEntity } from './entities/gym.entity';
import { GymService } from './gym.service';

@Module({
  imports: [TypeOrmModule.forFeature([GymEntity])],
  providers: [GymService],
  exports: [GymService],
})
export class GymModule {}
