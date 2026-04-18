import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { EditResultCommand } from '../edit-result.command';
import { EditResultResponseDto } from '../dto/edit-result-response.dto';
import { ClassRepository } from '../../../repositories/class.repository';
import { AttendanceRepository } from '../../../repositories/attendance.repository';
import { ResultRepository } from '../../../repositories/result.repository';
import { ResultEntity } from '../../../domain/result/entities/result.entity';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

/**
 * EditResultHandler: Orchestrates result editing
 *
 * Responsibilities:
 * - Enforce all 4 preconditions from COMMAND_MODEL.md lines 410-415
 * - Validate metric type and unit align with class type result metrics (if provided)
 * - Update ResultEntity with provided fields only
 * - Set edited_at = now
 * - Persist via repository
 *
 * COMMAND_MODEL.md reference: lines 395-433
 */
@CommandHandler(EditResultCommand)
export class EditResultHandler implements ICommandHandler<EditResultCommand> {
  constructor(
    @Inject(ClassRepository) private readonly classRepository: ClassRepository,
    @Inject(AttendanceRepository)
    private readonly attendanceRepository: AttendanceRepository,
    @Inject(ResultRepository)
    private readonly resultRepository: ResultRepository,
  ) {}

  async execute(command: EditResultCommand): Promise<EditResultResponseDto> {
    // Precondition 1: Verify result exists and belongs to the athlete
    const result = await this.resultRepository.getResultById(command.resultId);
    if (!result) {
      throw new NotFoundException('Result not found');
    }
    if (result.userId !== command.userId) {
      throw new ForbiddenException('Result does not belong to this athlete');
    }

    // Get the class to check its state
    const classEntity = await this.classRepository.getClassById(result.classId);
    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    // Precondition 2: Verify class is not archived
    if (classEntity.state === 'archived') {
      throw new BadRequestException('Cannot edit results for archived classes');
    }

    // Precondition 3: Verify athlete was marked present
    const attendance =
      await this.attendanceRepository.getAttendanceByUserAndClass(
        command.userId,
        result.classId,
      );
    if (!attendance || !attendance.present) {
      throw new ForbiddenException(
        'Athlete was not marked present for this class',
      );
    }

    // Precondition 4: Validate metric type/unit if provided
    if (command.metricType || command.unit) {
      // Get the class type to validate metrics
      const classType = classEntity.classType;

      // If metricType is provided, validate it
      if (command.metricType) {
        if (command.metricType !== classType.resultMetrics) {
          throw new BadRequestException(
            `Metric type must be ${classType.resultMetrics} for this class type`,
          );
        }
      }

      // Validate unit if provided (use current metric type if not changing)
      const metricTypeToValidate = command.metricType || result.metricType;
      if (command.unit) {
        this.validateMetricUnitAlignment(metricTypeToValidate, command.unit);
      }
    }

    // State Change: Update result with provided fields
    if (command.metricType) {
      result.metricType = command.metricType;
    }
    if (command.value !== undefined) {
      result.value = command.value;
    }
    if (command.unit) {
      result.unit = command.unit;
    }
    if (command.notes !== undefined) {
      result.notes = command.notes || null;
    }

    // Set edited_at = now
    result.editedAt = new Date();

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
      throw new BadRequestException(
        `Unit ${unit} is not valid for metric type ${metricType}`,
      );
    }
  }

  private mapToResponseDto(result: ResultEntity): EditResultResponseDto {
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
