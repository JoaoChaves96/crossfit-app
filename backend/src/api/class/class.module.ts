import { Module } from '@nestjs/common';
import { ClassModule } from '../../domain/class/class.module';
import { ClassController } from './class.controller';

@Module({
  imports: [ClassModule],
  controllers: [ClassController],
})
export class ClassApiModule {}
