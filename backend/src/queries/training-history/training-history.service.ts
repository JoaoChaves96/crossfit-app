import { Injectable } from '@nestjs/common';
import { AttendanceRepository } from '../../repositories/attendance.repository';
import { ResultRepository } from '../../repositories/result.repository';
import {
  TrainingHistoryItemDto,
  TrainingHistoryResultDto,
} from './dto/training-history-item.dto';
import { GetTrainingHistoryResponseDto } from './dto/get-training-history-response.dto';
import { ResultEntity } from '../../domain/result/entities/result.entity';

/**
 * TrainingHistoryService: Query handler for an athlete's past training history
 *
 * Returns attended classes (present = true) in a specific gym where the class
 * state is completed or archived, ordered by scheduled date descending.
 *
 * Each item includes the class metadata and the athlete's logged result if one exists.
 *
 * gymId isolation is enforced at two levels:
 * - RolesGuard validates the athlete has active membership in the gym
 * - This service scopes the attendance query to the provided gymId
 */
@Injectable()
export class TrainingHistoryService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly resultRepository: ResultRepository,
  ) {}

  /**
   * Retrieve the training history for an authenticated athlete in a specific gym
   *
   * @param userId - The authenticated user's ID
   * @param gymId - The gym to scope history to
   * @returns History items ordered by scheduled date descending
   */
  async getTrainingHistory(
    userId: string,
    gymId: string,
  ): Promise<GetTrainingHistoryResponseDto> {
    const attendanceRecords =
      await this.attendanceRepository.getPresentAttendanceByUserAndGym(
        userId,
        gymId,
        ['completed', 'archived'],
      );

    if (attendanceRecords.length === 0) {
      return { history: [] };
    }

    const classIds = attendanceRecords.map((a) => a.classId);

    const results = await this.resultRepository.getResultsByUserAndClassIds(
      userId,
      classIds,
    );

    const resultByClassId = new Map<string, ResultEntity>(
      results.map((r) => [r.classId, r]),
    );

    const history: TrainingHistoryItemDto[] = attendanceRecords.map(
      (attendance) => {
        const cls = attendance.class;
        const classType = cls.classType;
        const result = resultByClassId.get(attendance.classId) ?? null;

        const scheduledAt = this.combineDateTime(
          cls.scheduledDate,
          cls.scheduledTime,
        );

        const resultDto: TrainingHistoryResultDto | null = result
          ? {
              id: result.id,
              metricType: result.metricType,
              value: result.value,
              unit: result.unit,
              notes: result.notes,
              loggedAt: result.loggedAt,
              editedAt: result.editedAt,
            }
          : null;

        return {
          classId: cls.id,
          className: classType.name,
          scheduledAt,
          classState: cls.state as 'completed' | 'archived',
          result: resultDto,
        };
      },
    );

    return { history };
  }

  /**
   * Combine a date and a time string into an ISO 8601 datetime string.
   *
   * TypeORM returns `scheduledDate` as a Date object and `scheduledTime` as
   * an HH:MM:SS string. This merges them into a single ISO string without
   * altering either value.
   */
  private combineDateTime(scheduledDate: Date, scheduledTime: string): string {
    const dateStr = scheduledDate instanceof Date
      ? scheduledDate.toISOString().slice(0, 10)
      : String(scheduledDate).slice(0, 10);
    return `${dateStr}T${scheduledTime}`;
  }
}
