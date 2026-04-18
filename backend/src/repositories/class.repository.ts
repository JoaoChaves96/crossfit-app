import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
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
   * Retrieve a class by ID (soft delete aware)
   */
  async getClassById(classId: string): Promise<ClassEntity | null> {
    return this.classRepository.findOne({
      where: { id: classId, deletedAt: IsNull() },
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
   * Check if a class exists
   */
  async classExists(classId: string): Promise<boolean> {
    const count = await this.classRepository.count({
      where: { id: classId, deletedAt: IsNull() },
    });
    return count > 0;
  }
}
