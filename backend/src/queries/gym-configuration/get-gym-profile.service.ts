import { Injectable, NotFoundException } from '@nestjs/common';
import { GymService } from '../../domain/gym/gym.service';
import { GymProfileDto } from './dto/gym-profile.dto';

@Injectable()
export class GetGymProfileService {
  constructor(private readonly gymService: GymService) {}

  async getProfile(gymId: string): Promise<GymProfileDto> {
    const gym = await this.gymService.getGymById(gymId);

    if (!gym) {
      throw new NotFoundException(`Gym with id ${gymId} not found`);
    }

    return {
      id: gym.id,
      name: gym.name,
      description: gym.description,
      location: gym.location,
      status: gym.status,
      createdAt: gym.createdAt,
    };
  }
}
