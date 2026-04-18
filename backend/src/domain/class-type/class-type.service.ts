import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ClassTypeEntity } from './entities/class-type.entity';

@Injectable()
export class ClassTypeService {
  constructor(
    @InjectRepository(ClassTypeEntity)
    private readonly classTypeRepository: Repository<ClassTypeEntity>,
  ) {}

  async getClassTypeById(classTypeId: string): Promise<ClassTypeEntity | null> {
    return this.classTypeRepository.findOne({
      where: { id: classTypeId, deletedAt: IsNull() },
    });
  }

  async getClassTypesByGym(gymId: string): Promise<ClassTypeEntity[]> {
    return this.classTypeRepository.find({
      where: { gymId, deletedAt: IsNull() },
      order: { name: 'ASC' },
    });
  }

  async getActiveClassTypesByGym(gymId: string): Promise<ClassTypeEntity[]> {
    return this.classTypeRepository.find({
      where: { gymId, deletedAt: IsNull() },
      order: { name: 'ASC' },
    });
  }
}
