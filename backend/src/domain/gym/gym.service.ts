import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GymEntity } from './entities/gym.entity';

@Injectable()
export class GymService {
  constructor(
    @InjectRepository(GymEntity)
    private readonly gymRepository: Repository<GymEntity>,
  ) {}

  async getGymById(gymId: string): Promise<GymEntity | null> {
    return this.gymRepository.findOne({
      where: { id: gymId },
    });
  }

  async getGymsByOwner(ownerId: string): Promise<GymEntity[]> {
    return this.gymRepository.find({
      where: { ownerUserId: ownerId },
    });
  }

  async getActiveGyms(): Promise<GymEntity[]> {
    return this.gymRepository.find({
      where: { status: 'active' },
    });
  }

  async saveGym(gym: GymEntity): Promise<GymEntity> {
    return this.gymRepository.save(gym);
  }
}
