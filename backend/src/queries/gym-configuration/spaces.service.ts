import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { SpaceEntity } from '../../domain/space/entities/space.entity';
import { SpaceItemDto } from './dto/space-item.dto';
import { GetSpacesResponseDto } from './dto/get-spaces-response.dto';

@Injectable()
export class SpacesQueryService {
  constructor(
    @InjectRepository(SpaceEntity)
    private readonly spaceRepository: Repository<SpaceEntity>,
  ) {}

  async getSpacesByGym(gymId: string): Promise<GetSpacesResponseDto> {
    const entities = await this.spaceRepository.find({
      where: { gymId, deletedAt: IsNull() },
    });

    const spaces: SpaceItemDto[] = entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      baseCapacity: entity.baseCapacity,
    }));

    return { spaces };
  }
}
