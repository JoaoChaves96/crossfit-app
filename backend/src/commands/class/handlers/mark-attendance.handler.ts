import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { MarkAttendanceCommand } from '../mark-attendance.command';
import {
  MarkAttendanceResponseDto,
  AttendanceRecordResponseDto,
} from '../dto/mark-attendance-response.dto';
import { ClassRepository } from '../../../repositories/class.repository';
import { AttendanceRepository } from '../../../repositories/attendance.repository';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { AttendanceEntity } from '../../../domain/attendance/entities/attendance.entity';
import { notFound, forbidden, invalidState } from '../../../http/exceptions';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { v4 as uuid } from 'uuid';

/**
 * MarkAttendanceHandler: Orchestrates attendance marking
 *
 * Responsibilities:
 * - Enforce all 4 preconditions from COMMAND_MODEL.md lines 577-582
 * - Create or update Attendance records with present status
 * - Return all marked attendance records
 *
 * Deliberately does NOT promote from the waitlist. Attendance is only markable
 * once the class is in_progress or completed, so a promotion here would add an
 * athlete to a session already underway or over. Promotion belongs to
 * CancelBooking, which is guarded on state === 'published'.
 *
 * COMMAND_MODEL.md reference: lines 562-605
 */
@CommandHandler(MarkAttendanceCommand)
export class MarkAttendanceHandler implements ICommandHandler<MarkAttendanceCommand> {
  constructor(
    @Inject(ClassRepository) private readonly classRepository: ClassRepository,
    @Inject(AttendanceRepository)
    private readonly attendanceRepository: AttendanceRepository,
    @Inject(GymStaffService)
    private readonly gymStaffService: GymStaffService,
    @InjectRepository(AttendanceEntity)
    private readonly attendanceDbRepository: Repository<AttendanceEntity>,
  ) {}

  async execute(
    command: MarkAttendanceCommand,
  ): Promise<MarkAttendanceResponseDto> {
    // Precondition 1: Verify class exists and belongs to the gym in the route
    const classEntity = await this.classRepository.getClassById(
      command.classId,
      command.gymId,
    );
    if (!classEntity) {
      throw notFound('Class not found');
    }

    // Ownership guard: class must belong to the gym supplied in the command
    if (classEntity.gymId !== command.gymId) {
      throw forbidden('Class does not belong to the specified gym');
    }

    // Verify the coach is assigned to this specific class
    if (classEntity.coachUserId !== command.userId) {
      throw forbidden('Coach is not assigned to this class');
    }

    // Verify coach is active in the gym
    const isCoachActive = await this.gymStaffService.isCoachAssignedToClass(
      command.userId,
      command.classId,
      classEntity.gymId,
    );
    if (!isCoachActive) {
      throw forbidden('Coach is not active for this gym');
    }

    // Precondition 2: Verify class exists and state is in_progress or completed
    // (Implicitly also verifies class is not archived, since archived is neither in_progress nor completed)
    if (
      classEntity.state !== 'in_progress' &&
      classEntity.state !== 'completed'
    ) {
      throw invalidState('Attendance can only be marked while class is in progress or completed');
    }

    // Precondition 4: At least one attendance record must be provided
    if (command.attendanceRecords.length === 0) {
      throw invalidState('At least one attendance record is required');
    }

    // State Change: Create or update attendance records
    const markedRecords: AttendanceRecordResponseDto[] = [];
    const now = new Date();

    for (const record of command.attendanceRecords) {
      // Check if attendance already exists
      let attendance =
        await this.attendanceRepository.getAttendanceByUserAndClass(
          record.athleteUserId,
          command.classId,
        );

      if (!attendance) {
        // Create new attendance
        attendance = new AttendanceEntity();
        attendance.id = uuid();
        attendance.classId = command.classId;
        attendance.userId = record.athleteUserId;
        attendance.present = record.present;
        attendance.markedAt = now;
        attendance.markedByUserId = command.userId;
        attendance.notes = record.notes || null;
      } else {
        // Update existing attendance
        attendance.present = record.present;
        attendance.markedAt = now;
        attendance.markedByUserId = command.userId;
        if (record.notes !== undefined) {
          attendance.notes = record.notes;
        }
      }

      // Save attendance record
      const savedAttendance = await this.attendanceRepository.save(attendance);
      markedRecords.push(
        this.mapToAttendanceRecordResponseDto(savedAttendance),
      );
    }

    return {
      classId: command.classId,
      attendanceRecords: markedRecords,
    };
  }

  private mapToAttendanceRecordResponseDto(
    attendance: AttendanceEntity,
  ): AttendanceRecordResponseDto {
    return {
      id: attendance.id,
      classId: attendance.classId,
      userId: attendance.userId,
      present: attendance.present,
      markedAt: attendance.markedAt,
      markedByUserId: attendance.markedByUserId,
      notes: attendance.notes,
    };
  }
}
