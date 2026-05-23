import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClassRepository } from '../../repositories/class.repository';
import { ProgrammingRepository } from '../../repositories/programming.repository';
import { GymStaffService } from '../../domain/gym-staff/gym-staff.service';
import { GetClassProgrammingResponseDto } from './dto/get-class-programming-response.dto';

/**
 * GetClassProgrammingService: Query handler for fetching WOD programming for a class
 *
 * Access rules:
 * - Coach assigned to the class (active in the gym and coachUserId matches)
 * - Gym owner of the gym the class belongs to
 *
 * gymId scoping is enforced: the class must belong to the gym in the route param.
 * Returns null content fields when no programming exists — does not throw 404.
 */
@Injectable()
export class GetClassProgrammingService {
  constructor(
    private readonly classRepository: ClassRepository,
    private readonly programmingRepository: ProgrammingRepository,
    private readonly gymStaffService: GymStaffService,
  ) {}

  /**
   * Retrieve programming for a class, enforcing gymId scoping and access control.
   *
   * @param gymId - The gym ID from the route param
   * @param classId - The class ID from the route param
   * @param requestingUserId - The authenticated user requesting the programming
   * @returns Programming content and loggable status, or null content if none exists
   * @throws NotFoundException if the class does not exist or does not belong to the gym
   * @throws ForbiddenException if the requesting user is neither the assigned coach nor the gym owner
   */
  async getClassProgramming(
    gymId: string,
    classId: string,
    requestingUserId: string,
  ): Promise<GetClassProgrammingResponseDto> {
    // Verify class exists and belongs to the specified gym (gymId scoping)
    const classEntity = await this.classRepository.getClassById(classId, gymId);

    if (!classEntity) {
      throw new NotFoundException(`Class ${classId} not found in gym ${gymId}`);
    }

    // Verify gymId on the class matches the route param (defense in depth)
    if (classEntity.gymId !== gymId) {
      throw new ForbiddenException('Class does not belong to this gym');
    }

    // Access control: allow coaches assigned to this class or gym owners
    const isOwner = await this.gymStaffService.isGymOwner(
      requestingUserId,
      gymId,
    );
    const isAssignedCoach =
      classEntity.coachUserId === requestingUserId &&
      (await this.gymStaffService.isCoach(requestingUserId, gymId));

    if (!isOwner && !isAssignedCoach) {
      throw new ForbiddenException(
        'Only the assigned coach or a gym owner can view class programming',
      );
    }

    // Fetch programming — may be null if not yet created
    const programming =
      await this.programmingRepository.getProgrammingByClassId(classId);

    return {
      content: programming ? programming.content : null,
      loggable: classEntity.loggable,
      lastUpdatedAt: programming ? programming.lastModifiedAt : null,
    };
  }
}
