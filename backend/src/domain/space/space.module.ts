import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpaceEntity } from './entities/space.entity';
import { SpaceService } from './space.service';

@Module({
  imports: [TypeOrmModule.forFeature([SpaceEntity])],
  providers: [SpaceService],
  exports: [SpaceService],
})
export class SpaceModule {}
