import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { GymStaffEntity } from '../../domain/gym-staff/entities/gym-staff.entity';
import { UserEntity } from '../../domain/user/entities/user.entity';
import { ClassEntity } from '../../domain/class/entities/class.entity';
import { ClassTypeEntity } from '../../domain/class-type/entities/class-type.entity';
import { CoachListItemDto } from './dto/coach-list-item.dto';
import { GetCoachesResponseDto } from './dto/get-coaches-response.dto';

@Injectable()
export class CoachesQueryService {
  constructor(
    @InjectRepository(GymStaffEntity)
    private readonly gymStaffRepository: Repository<GymStaffEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ClassEntity)
    private readonly classRepository: Repository<ClassEntity>,
    @InjectRepository(ClassTypeEntity)
    private readonly classTypeRepository: Repository<ClassTypeEntity>,
  ) {}

  async getCoachesByGym(gymId: string): Promise<GetCoachesResponseDto> {
    const staffEntries = await this.gymStaffRepository.find({
      where: { gymId, role: 'coach' },
    });

    // Resolve the gym's class-type id -> name map once (scoped to this gym).
    const classTypes = await this.classTypeRepository.find({
      where: { gymId, deletedAt: IsNull() },
    });
    const classTypeNameById = new Map<string, string>(
      classTypes.map((ct) => [ct.id, ct.name]),
    );

    // Load the gym's non-deleted classes once, then group coachUserId ->
    // set of distinct class-type names. Avoids an N+1 query per coach.
    const classes = await this.classRepository.find({
      where: { gymId, deletedAt: IsNull() },
    });
    const classTypeNamesByCoach = new Map<string, Set<string>>();
    for (const cls of classes) {
      const name = classTypeNameById.get(cls.classTypeId);
      if (!name) continue;
      let names = classTypeNamesByCoach.get(cls.coachUserId);
      if (!names) {
        names = new Set<string>();
        classTypeNamesByCoach.set(cls.coachUserId, names);
      }
      names.add(name);
    }

    const coaches: CoachListItemDto[] = await Promise.all(
      staffEntries.map(async (staff) => {
        const user = await this.userRepository.findOne({
          where: { id: staff.userId },
        });

        const classesAssigned = Array.from(
          classTypeNamesByCoach.get(staff.userId) ?? [],
        ).sort();

        return {
          id: staff.id,
          userId: staff.userId,
          name: user?.name ?? '',
          email: user?.email ?? '',
          role: staff.role,
          status: staff.status,
          assignedAt: staff.assignedAt,
          classesAssigned,
        };
      }),
    );

    return { coaches };
  }
}
