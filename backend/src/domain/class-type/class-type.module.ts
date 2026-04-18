import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassTypeEntity } from './entities/class-type.entity';
import { ClassTypeService } from './class-type.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClassTypeEntity])],
  providers: [ClassTypeService],
  exports: [ClassTypeService],
})
export class ClassTypeModule {}
