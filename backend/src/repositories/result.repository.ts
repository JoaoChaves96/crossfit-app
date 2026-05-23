import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResultEntity } from '../domain/result/entities/result.entity';

/**
 * ResultRepository: Pure persistence layer for result records
 *
 * Responsibilities:
 * - Persist ResultEntity instances
 * - Query/retrieve ResultEntity instances
 * - Validate existence
 *
 * MUST NOT:
 * - Create domain entities
 * - Decide initial state or timestamps
 */
@Injectable()
export class ResultRepository {
  constructor(
    @InjectRepository(ResultEntity)
    private readonly resultRepository: Repository<ResultEntity>,
  ) {}

  /**
   * Persist a ResultEntity to the database
   */
  async save(resultEntity: ResultEntity): Promise<ResultEntity> {
    return this.resultRepository.save(resultEntity);
  }

  /**
   * Retrieve a result by ID
   */
  async getResultById(resultId: string): Promise<ResultEntity | null> {
    return this.resultRepository.findOne({
      where: { id: resultId },
    });
  }

  /**
   * Retrieve result for a specific user and class
   */
  async getResultByUserAndClass(
    userId: string,
    classId: string,
  ): Promise<ResultEntity | null> {
    return this.resultRepository.findOne({
      where: { userId, classId },
    });
  }

  /**
   * Retrieve all results for a class
   */
  async getResultsByClass(classId: string): Promise<ResultEntity[]> {
    return this.resultRepository.find({
      where: { classId },
      order: { loggedAt: 'ASC' },
    });
  }

  /**
   * Retrieve all results for a user
   */
  async getResultsByUser(userId: string): Promise<ResultEntity[]> {
    return this.resultRepository.find({
      where: { userId },
      order: { loggedAt: 'ASC' },
    });
  }

  /**
   * Retrieve all results for a user in a specific class
   */
  async getResultsByUserAndClass(
    userId: string,
    classId: string,
  ): Promise<ResultEntity[]> {
    return this.resultRepository.find({
      where: { userId, classId },
    });
  }

  /**
   * Retrieve all results for a user across a set of class IDs in a single query
   *
   * @param userId - The user whose results to retrieve
   * @param classIds - The class IDs to filter by
   */
  async getResultsByUserAndClassIds(
    userId: string,
    classIds: string[],
  ): Promise<ResultEntity[]> {
    if (classIds.length === 0) {
      return [];
    }
    return this.resultRepository
      .createQueryBuilder('result')
      .where('result.userId = :userId', { userId })
      .andWhere('result.classId IN (:...classIds)', { classIds })
      .getMany();
  }

  /**
   * Check if result exists for user and class
   */
  async resultExists(userId: string, classId: string): Promise<boolean> {
    const count = await this.resultRepository.count({
      where: { userId, classId },
    });
    return count > 0;
  }
}
