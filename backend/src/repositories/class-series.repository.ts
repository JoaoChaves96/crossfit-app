import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassSeriesEntity } from '../domain/class-series/entities/class-series.entity';

@Injectable()
export class ClassSeriesRepository {
  constructor(
    @InjectRepository(ClassSeriesEntity)
    private readonly repo: Repository<ClassSeriesEntity>,
  ) {}

  async save(series: ClassSeriesEntity): Promise<ClassSeriesEntity> {
    return this.repo.save(series);
  }
}
