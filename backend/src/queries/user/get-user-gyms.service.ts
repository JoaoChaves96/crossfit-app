import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GymStaffEntity } from '../../domain/gym-staff/entities/gym-staff.entity';
import { GymMembershipEntity } from '../../domain/gym-membership/entities/gym-membership.entity';
import { GymEntity } from '../../domain/gym/entities/gym.entity';
import { GetUserGymsResponseDto, UserGymDto } from './dto/user-gyms-response.dto';

/**
 * Every gym the caller can act in, which is what the gym switcher offers.
 *
 * Staff attachment wins over membership at the same gym, matching
 * AuthService.resolveGymContextFor — an owner or coach who also trains at their
 * own gym operates as staff, so offering "athlete at Box A" would hand them a
 * context the switcher could not reproduce.
 */
@Injectable()
export class GetUserGymsService {
  constructor(
    @InjectRepository(GymStaffEntity)
    private readonly gymStaffRepository: Repository<GymStaffEntity>,
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
    @InjectRepository(GymEntity)
    private readonly gymRepository: Repository<GymEntity>,
  ) {}

  async getGyms(userId: string): Promise<GetUserGymsResponseDto> {
    const staffRows = await this.gymStaffRepository.find({
      where: { userId, status: 'active' },
    });
    const membershipRows = await this.gymMembershipRepository.find({
      where: { userId, status: 'active' },
    });

    const roleByGymId = new Map<string, UserGymDto['role']>();
    for (const staff of staffRows) {
      roleByGymId.set(staff.gymId, staff.role);
    }
    for (const membership of membershipRows) {
      if (!roleByGymId.has(membership.gymId)) {
        roleByGymId.set(membership.gymId, 'athlete');
      }
    }

    const gymIds = [...roleByGymId.keys()];
    if (gymIds.length === 0) {
      return { gyms: [] };
    }

    const gyms = await this.gymRepository.find({ where: { id: In(gymIds) } });
    const nameById = new Map(gyms.map((gym) => [gym.id, gym.name]));

    return {
      gyms: gymIds.map((gymId) => ({
        gymId,
        gymName: nameById.get(gymId) ?? '',
        role: roleByGymId.get(gymId)!,
      })),
    };
  }
}
