import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { SpaceEntity } from './entities/space.entity';

@Injectable()
export class SpaceService {
  constructor(
    @InjectRepository(SpaceEntity)
    private readonly spaceRepository: Repository<SpaceEntity>,
  ) {}

  async getSpaceById(spaceId: string): Promise<SpaceEntity | null> {
    return this.spaceRepository.findOne({
      where: { id: spaceId, deletedAt: IsNull() },
    });
  }

  async getSpacesByGym(gymId: string): Promise<SpaceEntity[]> {
    return this.spaceRepository.find({
      where: { gymId, deletedAt: IsNull() },
      order: { name: 'ASC' },
    });
  }

  async getSpacesByGymWithCapacity(
    gymId: string,
    minCapacity: number,
  ): Promise<SpaceEntity[]> {
    return this.spaceRepository
      .createQueryBuilder('space')
      .where('space.gymId = :gymId', { gymId })
      .andWhere('space.baseCapacity >= :minCapacity', { minCapacity })
      .andWhere('space.deletedAt IS NULL')
      .orderBy('space.name', 'ASC')
      .getMany();
  }
}
