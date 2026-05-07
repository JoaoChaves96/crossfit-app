import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { LogResultCommand } from '../log-result.command';
import { LogResultResponseDto } from '../dto/log-result-response.dto';
import { ClassRepository } from '../../../repositories/class.repository';
import { AttendanceRepository } from '../../../repositories/attendance.repository';
import { ResultRepository } from '../../../repositories/result.repository';
import { ResultEntity } from '../../../domain/result/entities/result.entity';
import { ConflictException } from '@nestjs/common';
import { notFound, forbidden, invalidState } from '../../../http/exceptions';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';

/**
 * LogResultHandler: Orchestrates result logging
 *
 * Responsibilities:
 * - Enforce all 5 preconditions from COMMAND_MODEL.md lines 364-370
 * - Validate metric type and unit align with class type result metrics
 * - Create ResultEntity with proper initial state
 * - Persist via repository
 *
 * COMMAND_MODEL.md reference: lines 349-391
 */
@CommandHandler(LogResultCommand)
export class LogResultHandler implements ICommandHandler<LogResultCommand> {
  constructor(
    @Inject(ClassRepository) private readonly classRepository: ClassRepository,
    @Inject(AttendanceRepository)
    private readonly attendanceRepository: AttendanceRepository,
    @Inject(ResultRepository)
    private readonly resultRepository: ResultRepository,
    @InjectRepository(ResultEntity)
    private readonly resultDbRepository: Repository<ResultEntity>,
  ) {}

  async execute(command: LogResultCommand): Promise<LogResultResponseDto> {
    // Precondition 1: Verify class exists and state = completed
    const classEntity = await this.classRepository.getClassById(
      command.classId,
    );
    if (!classEntity) {
      throw notFound('Class not found');
    }
    if (classEntity.state !== 'completed') {
      throw invalidState('Results can only be logged for completed classes');
    }

    // Precondition 2: Verify athlete has Attendance record with present = true
    const attendance =
      await this.attendanceRepository.getAttendanceByUserAndClass(
        command.userId,
        command.classId,
      );
    if (!attendance || !attendance.present) {
      throw forbidden('Athlete was not marked present for this class');
    }

    // Precondition 3: Verify class type is loggable
    const classType = classEntity.classType;
    if (!classType.loggable) {
      throw invalidState('This class type does not allow result logging');
    }

    // Precondition 4: Verify result does not already exist for this (class, athlete) pair
    const existingResult = await this.resultRepository.getResultByUserAndClass(
      command.userId,
      command.classId,
    );
    if (existingResult) {
      throw new ConflictException('Result has already been logged for this class');
    }

    // Precondition 5: Verify metric type aligns with class_type.result_metrics
    // If resultMetrics is 'none', no results can be logged
    if (classType.resultMetrics === 'none') {
      throw invalidState('This class type does not allow result logging');
    }
    // Metric type must match the class_type.resultMetrics
    if (command.metricType !== classType.resultMetrics) {
      throw invalidState(
        `Metric type must be ${classType.resultMetrics} for this class type`,
      );
    }

    // Additional validation: ensure unit is valid for the metric type
    this.validateMetricUnitAlignment(command.metricType, command.unit);

    // State Change: Create ResultEntity
    const result = new ResultEntity();
    result.id = uuid();
    result.classId = command.classId;
    result.userId = command.userId;
    result.metricType = command.metricType;
    result.value = command.value;
    result.unit = command.unit;
    result.notes = command.notes || null;
    result.loggedAt = new Date();
    result.editedAt = null;

    // Persist via repository
    const savedResult = await this.resultRepository.save(result);

    // Map to response DTO
    return this.mapToResponseDto(savedResult);
  }

  /**
   * Validates that the unit is appropriate for the given metric type
   */
  private validateMetricUnitAlignment(metricType: string, unit: string): void {
    const validUnits: { [key: string]: string[] } = {
      time: ['seconds', 'minutes'],
      reps: ['reps'],
      weight: ['kg', 'lb'],
      rounds: ['rounds'],
      note: ['none'],
    };

    const allowed = validUnits[metricType];
    if (!allowed || !allowed.includes(unit)) {
      throw invalidState(`Unit ${unit} is not valid for metric type ${metricType}`);
    }
  }

  private mapToResponseDto(result: ResultEntity): LogResultResponseDto {
    return {
      id: result.id,
      classId: result.classId,
      userId: result.userId,
      metricType: result.metricType,
      value: result.value,
      unit: result.unit,
      notes: result.notes,
      loggedAt: result.loggedAt,
      editedAt: result.editedAt,
    };
  }
}
