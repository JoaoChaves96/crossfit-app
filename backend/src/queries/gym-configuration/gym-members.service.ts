import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GymMembershipEntity } from '../../domain/gym-membership/entities/gym-membership.entity';
import { GymMemberItemDto } from './dto/gym-member-item.dto';
import { GetGymMembersResponseDto } from './dto/get-gym-members-response.dto';

@Injectable()
export class GymMembersQueryService {
  constructor(
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
  ) {}

  async getMembersByGym(gymId: string): Promise<GetGymMembersResponseDto> {
    const memberships = await this.gymMembershipRepository.find({
      where: { gymId, status: 'active' },
      relations: ['user'],
      order: { joinedAt: 'DESC' },
    });

    const members: GymMemberItemDto[] = memberships.map((membership) => ({
      id: membership.id,
      userId: membership.userId,
      name: membership.user.name,
      email: membership.user.email,
      status: membership.status,
      joinedAt: membership.joinedAt,
    }));

    return { members };
  }
}
