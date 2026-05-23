import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ClassTypeEntity } from '../../domain/class-type/entities/class-type.entity';
import { ClassTypeItemDto } from './dto/class-type-item.dto';
import { GetClassTypesResponseDto } from './dto/get-class-types-response.dto';

@Injectable()
export class ClassTypesQueryService {
  constructor(
    @InjectRepository(ClassTypeEntity)
    private readonly classTypeRepository: Repository<ClassTypeEntity>,
  ) {}

  async getClassTypesByGym(gymId: string): Promise<GetClassTypesResponseDto> {
    const entities = await this.classTypeRepository.find({
      where: { gymId, deletedAt: IsNull() },
    });

    const classTypes: ClassTypeItemDto[] = entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      loggable: entity.loggable,
      resultMetrics: entity.resultMetrics,
    }));

    return { classTypes };
  }
}
