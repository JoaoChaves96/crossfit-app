import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ClassEntity } from '../domain/class/entities/class.entity';

/**
 * ClassRepository: Pure persistence layer
 *
 * Responsibilities:
 * - Persist ClassEntity instances
 * - Query/retrieve ClassEntity instances
 * - Validate existence and ownership
 *
 * MUST NOT:
 * - Create domain entities (that's the handler's job)
 * - Decide initial state or timestamps
 * - Accept command-like DTOs
 */
@Injectable()
export class ClassRepository {
  constructor(
    @InjectRepository(ClassEntity)
    private readonly classRepository: Repository<ClassEntity>,
  ) {}

  /**
   * Persist a ClassEntity to the database
   * @param classEntity The entity to save (must be complete)
   */
  async save(classEntity: ClassEntity): Promise<ClassEntity> {
    return this.classRepository.save(classEntity);
  }

  /**
   * Retrieve a class by ID (soft delete aware).
   * When gymId is provided it is included in the WHERE clause so the query
   * only matches classes that belong to that gym.
   */
  async getClassById(
    classId: string,
    gymId?: string,
  ): Promise<ClassEntity | null> {
    return this.classRepository.findOne({
      where: gymId
        ? { id: classId, gymId, deletedAt: IsNull() }
        : { id: classId, deletedAt: IsNull() },
    });
  }

  /**
   * Retrieve all classes for a gym (soft delete aware)
   */
  async getClassesByGym(gymId: string): Promise<ClassEntity[]> {
    return this.classRepository.find({
      where: { gymId, deletedAt: IsNull() },
      order: { scheduledDate: 'ASC', scheduledTime: 'ASC' },
    });
  }

  /**
   * Retrieve all classes assigned to a coach
   */
  async getClassesByCoach(coachUserId: string): Promise<ClassEntity[]> {
    return this.classRepository.find({
      where: { coachUserId, deletedAt: IsNull() },
      order: { scheduledDate: 'ASC' },
    });
  }

  /**
   * Retrieve all non-deleted classes for a gym assigned to a specific coach.
   * Scoped by both gymId and coachUserId to prevent cross-gym and cross-coach access.
   */
  async getClassesByGymAndCoach(
    gymId: string,
    coachUserId: string,
  ): Promise<ClassEntity[]> {
    return this.classRepository.find({
      where: { gymId, coachUserId, deletedAt: IsNull() },
      order: { scheduledDate: 'ASC', scheduledTime: 'ASC' },
    });
  }

  /**
   * Retrieve classes by gym and state
   */
  async getClassesByGymAndState(
    gymId: string,
    state:
      | 'published'
      | 'booking_closed'
      | 'in_progress'
      | 'completed'
      | 'archived',
  ): Promise<ClassEntity[]> {
    return this.classRepository.find({
      where: { gymId, state, deletedAt: IsNull() },
      order: { scheduledDate: 'ASC' },
    });
  }

  /**
   * Retrieve all non-deleted classes whose state is one of the provided values.
   * Used by the lifecycle scheduler to find classes eligible for auto-transition.
   */
  async getClassesByStates(
    states: ClassEntity['state'][],
  ): Promise<ClassEntity[]> {
    return this.classRepository.find({
      where: { state: In(states), deletedAt: IsNull() },
    });
  }

  /**
   * Persist multiple ClassEntity instances in a single call.
   * Used by the lifecycle scheduler for bulk state transitions.
   */
  async saveMany(classes: ClassEntity[]): Promise<ClassEntity[]> {
    return this.classRepository.save(classes);
  }

  /**
   * Check if a class exists
   */
  async classExists(classId: string): Promise<boolean> {
    const count = await this.classRepository.count({
      where: { id: classId, deletedAt: IsNull() },
    });
    return count > 0;
  }

  /**
   * Find non-deleted classes that exactly match a series' shared fields on any
   * of the given dates at the given time. Used to skip exact-duplicate
   * occurrences when generating a recurring series (idempotent re-runs).
   */
  async findMatchingOccurrences(params: {
    gymId: string;
    classTypeId: string;
    coachUserId: string;
    spaceId: string;
    dates: string[];
    scheduledTime: string;
  }): Promise<Array<{ scheduledDate: string }>> {
    if (params.dates.length === 0) return [];
    const rows = await this.classRepository.find({
      where: {
        gymId: params.gymId,
        classTypeId: params.classTypeId,
        coachUserId: params.coachUserId,
        spaceId: params.spaceId,
        scheduledTime: params.scheduledTime,
        scheduledDate: In(params.dates) as unknown as Date,
        deletedAt: IsNull(),
      },
      select: ['scheduledDate'],
    });
    return rows.map((r) => ({
      scheduledDate:
        r.scheduledDate instanceof Date
          ? r.scheduledDate.toISOString().slice(0, 10)
          : String(r.scheduledDate),
    }));
  }
}
