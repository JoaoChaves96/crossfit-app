import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClassRepository } from '../../repositories/class.repository';
import { ResultRepository } from '../../repositories/result.repository';
import { GymStaffService } from '../../domain/gym-staff/gym-staff.service';
import { UserService } from '../../domain/user/user.service';
import { GetClassResultsResponseDto } from './dto/get-class-results-response.dto';
import { ClassResultItemDto } from './dto/class-result-item.dto';

/**
 * GetClassResultsService: Query handler for viewing athlete results for a class
 *
 * Access rules:
 * - Coaches assigned to the class (active in the gym and coachUserId matches)
 * - Gym owners of the gym the class belongs to
 *
 * gymId scoping is enforced: the class must belong to the gym in the route param.
 */
@Injectable()
export class GetClassResultsService {
  constructor(
    private readonly classRepository: ClassRepository,
    private readonly resultRepository: ResultRepository,
    private readonly gymStaffService: GymStaffService,
    private readonly userService: UserService,
  ) {}

  /**
   * Retrieve all results for a class, enforcing gymId scoping and access control.
   *
   * @param gymId - The gym ID from the route param
   * @param classId - The class ID from the route param
   * @param requestingUserId - The authenticated user requesting the results
   * @returns All results logged for the class
   * @throws NotFoundException if the class does not exist or does not belong to the gym
   * @throws ForbiddenException if the requesting user is neither the assigned coach nor the gym owner
   */
  async getClassResults(
    gymId: string,
    classId: string,
    requestingUserId: string,
  ): Promise<GetClassResultsResponseDto> {
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
        'Only the assigned coach or a gym owner can view class results',
      );
    }

    // Fetch all results for the class
    const resultEntities =
      await this.resultRepository.getResultsByClass(classId);

    // Resolve athlete display names (fallback to userId if unresolved)
    const results: ClassResultItemDto[] = await Promise.all(
      resultEntities.map(async (result) => {
        const user = await this.userService.getUserById(result.userId);
        return {
          id: result.id,
          userId: result.userId,
          userName: user ? user.name : result.userId,
          metricType: result.metricType,
          value: result.value,
          unit: result.unit,
          notes: result.notes,
          loggedAt: result.loggedAt,
          editedAt: result.editedAt,
        };
      }),
    );

    return { results };
  }
}
