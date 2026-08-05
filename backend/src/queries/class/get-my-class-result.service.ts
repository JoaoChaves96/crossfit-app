import { Injectable } from '@nestjs/common';
import { ClassRepository } from '../../repositories/class.repository';
import { ResultRepository } from '../../repositories/result.repository';
import { UserService } from '../../domain/user/user.service';
import { GetMyClassResultResponseDto } from './dto/get-my-class-result-response.dto';
import { ClassResultItemDto } from './dto/class-result-item.dto';
import { notFound } from '../../http/exceptions';

/**
 * GetMyClassResultService: Query handler for an athlete fetching THEIR OWN
 * result for a class.
 *
 * Access rules:
 * - The caller receives only their own result (scoped by userId).
 * - No owner/coach re-check: any authenticated user allowed by the route guard
 *   (athlete with active membership, coach, or owner) may read their own result.
 *
 * gymId scoping is enforced: the class must belong to the gym in the route param.
 * Returns null result when the caller has not logged one yet — does not throw 404.
 */
@Injectable()
export class GetMyClassResultService {
  constructor(
    private readonly classRepository: ClassRepository,
    private readonly resultRepository: ResultRepository,
    private readonly userService: UserService,
  ) {}

  /**
   * Retrieve the caller's own result for a class, enforcing gymId scoping.
   *
   * @param gymId - The gym ID from the route param
   * @param classId - The class ID from the route param
   * @param requestingUserId - The authenticated user requesting their own result
   * @returns The caller's result, or null if none has been logged yet
   * @throws NotFoundException if the class does not exist or does not belong to the gym
   */
  async getMyClassResult(
    gymId: string,
    classId: string,
    requestingUserId: string,
  ): Promise<GetMyClassResultResponseDto> {
    // Verify class exists and belongs to the specified gym (gymId scoping)
    const classEntity = await this.classRepository.getClassById(classId, gymId);

    if (!classEntity || classEntity.gymId !== gymId) {
      throw notFound(`Class ${classId} not found in gym ${gymId}`);
    }

    // Fetch only the caller's own result — never another athlete's
    const resultEntity = await this.resultRepository.getResultByUserAndClass(
      requestingUserId,
      classId,
    );

    if (!resultEntity) {
      return { result: null };
    }

    const user = await this.userService.getUserById(resultEntity.userId);

    const result: ClassResultItemDto = {
      id: resultEntity.id,
      userId: resultEntity.userId,
      userName: user ? user.name : resultEntity.userId,
      metricType: resultEntity.metricType,
      value: resultEntity.value,
      unit: resultEntity.unit,
      notes: resultEntity.notes,
      loggedAt: resultEntity.loggedAt,
      editedAt: resultEntity.editedAt,
    };

    return { result };
  }
}
