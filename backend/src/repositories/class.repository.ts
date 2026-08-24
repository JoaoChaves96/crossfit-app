import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { ClassEntity } from '../domain/class/entities/class.entity';
import { toCalendarDay } from '../domain/shared/calendar-day';

/**
 * Build the `scheduledDate` constraint for an optional, inclusive calendar-day
 * range. Each bound is independent, so a caller may bound one end only.
 *
 * Returns an EMPTY object when there is nothing to constrain, so the unbounded
 * query stays byte-identical to what it was before the range existed.
 */
function scheduledDateWithin(range?: {
  startDate?: string;
  endDate?: string;
}): Pick<FindOptionsWhere<ClassEntity>, 'scheduledDate'> {
  const start = range?.startDate;
  const end = range?.endDate;

  // The casts are the `date`-column seam: the entity types scheduledDate as Date
  // while the driver both accepts and returns 'YYYY-MM-DD'. Keeping the bound a
  // string is deliberate — see the note on getClassesByGym.
  const asBound = (day: string) => day as unknown as Date;

  if (start && end) {
    return { scheduledDate: Between(asBound(start), asBound(end)) };
  }
  if (start) return { scheduledDate: MoreThanOrEqual(asBound(start)) };
  if (end) return { scheduledDate: LessThanOrEqual(asBound(end)) };
  return {};
}

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
   * Retrieve classes for a gym (soft delete aware), optionally narrowed to a
   * calendar-day range.
   *
   * Both bounds are INCLUSIVE and independently optional: omitting the range
   * entirely returns the gym's whole schedule, which is the long-standing
   * behaviour every other caller relies on.
   *
   * Bounds are bare 'YYYY-MM-DD' strings compared against a `date` column, and
   * they must stay strings all the way into the query. Re-parsing a calendar day
   * with `new Date()` lands on UTC midnight, which west of UTC reads as the
   * previous day — that would shift the whole window by one silently.
   */
  async getClassesByGym(
    gymId: string,
    range?: { startDate?: string; endDate?: string },
  ): Promise<ClassEntity[]> {
    return this.classRepository.find({
      where: {
        gymId,
        deletedAt: IsNull(),
        ...scheduledDateWithin(range),
      },
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
      scheduledDate: toCalendarDay(r.scheduledDate),
    }));
  }
}
