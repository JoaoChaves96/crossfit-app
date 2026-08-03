import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GymStaffEntity } from '../../domain/gym-staff/entities/gym-staff.entity';
import { UserEntity } from '../../domain/user/entities/user.entity';
import { CoachListItemDto } from './dto/coach-list-item.dto';
import { GetCoachesResponseDto } from './dto/get-coaches-response.dto';

@Injectable()
export class CoachesQueryService {
  constructor(
    @InjectRepository(GymStaffEntity)
    private readonly gymStaffRepository: Repository<GymStaffEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async getCoachesByGym(gymId: string): Promise<GetCoachesResponseDto> {
    const staffEntries = await this.gymStaffRepository.find({
      where: { gymId, role: 'coach' },
    });

    const coaches: CoachListItemDto[] = await Promise.all(
      staffEntries.map(async (staff) => {
        const user = await this.userRepository.findOne({
          where: { id: staff.userId },
        });

        return {
          id: staff.id,
          userId: staff.userId,
          name: user?.name ?? '',
          email: user?.email ?? '',
          role: staff.role,
          status: staff.status,
          assignedAt: staff.assignedAt,
        };
      }),
    );

    return { coaches };
  }
}
