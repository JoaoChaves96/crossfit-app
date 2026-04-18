import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProgrammingEntity } from '../domain/programming/entities/programming.entity';

/**
 * ProgrammingRepository: Pure persistence layer for Programming
 *
 * Responsibilities:
 * - Persist ProgrammingEntity instances
 * - Query/retrieve ProgrammingEntity instances
 * - Validate existence and ownership
 *
 * MUST NOT:
 * - Create domain entities
 * - Decide timestamps or user attribution
 * - Accept command-like DTOs
 */
@Injectable()
export class ProgrammingRepository {
  constructor(
    @InjectRepository(ProgrammingEntity)
    private readonly programmingRepository: Repository<ProgrammingEntity>,
  ) {}

  /**
   * Persist a ProgrammingEntity to the database
   * @param programmingEntity The entity to save (must be complete)
   */
  async save(programmingEntity: ProgrammingEntity): Promise<ProgrammingEntity> {
    return this.programmingRepository.save(programmingEntity);
  }

  /**
   * Retrieve programming by class ID
   */
  async getProgrammingByClassId(
    classId: string,
  ): Promise<ProgrammingEntity | null> {
    return this.programmingRepository.findOne({
      where: { classId },
    });
  }

  /**
   * Check if programming exists for a class
   */
  async programmingExistsForClass(classId: string): Promise<boolean> {
    const count = await this.programmingRepository.count({
      where: { classId },
    });
    return count > 0;
  }
}
