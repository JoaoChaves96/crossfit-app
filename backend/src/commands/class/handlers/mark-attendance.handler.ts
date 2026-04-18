import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { MarkAttendanceCommand } from '../mark-attendance.command';
import {
  MarkAttendanceResponseDto,
  AttendanceRecordResponseDto,
} from '../dto/mark-attendance-response.dto';
import { ClassRepository } from '../../../repositories/class.repository';
import { AttendanceRepository } from '../../../repositories/attendance.repository';
import { BookingRepository } from '../../../repositories/booking.repository';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { AttendanceEntity } from '../../../domain/attendance/entities/attendance.entity';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BookingEntity } from '../../../domain/booking/entities/booking.entity';
import { v4 as uuid } from 'uuid';

/**
 * MarkAttendanceHandler: Orchestrates attendance marking
 *
 * Responsibilities:
 * - Enforce all 4 preconditions from COMMAND_MODEL.md lines 577-582
 * - Create or update Attendance records with present status
 * - Automatically promote waitlist if athlete changes from present to absent
 * - Return all marked attendance records
 *
 * COMMAND_MODEL.md reference: lines 562-605
 */
@CommandHandler(MarkAttendanceCommand)
export class MarkAttendanceHandler implements ICommandHandler<MarkAttendanceCommand> {
  constructor(
    @Inject(ClassRepository) private readonly classRepository: ClassRepository,
    @Inject(AttendanceRepository)
    private readonly attendanceRepository: AttendanceRepository,
    @Inject(BookingRepository)
    private readonly bookingRepository: BookingRepository,
    @Inject(GymStaffService)
    private readonly gymStaffService: GymStaffService,
    @InjectRepository(AttendanceEntity)
    private readonly attendanceDbRepository: Repository<AttendanceEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingDbRepository: Repository<BookingEntity>,
  ) {}

  async execute(
    command: MarkAttendanceCommand,
  ): Promise<MarkAttendanceResponseDto> {
    // Precondition 1: Verify coach is assigned to the class
    const classEntity = await this.classRepository.getClassById(
      command.classId,
    );
    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    // Verify the coach is assigned to this specific class
    if (classEntity.coachUserId !== command.userId) {
      throw new ForbiddenException('Coach is not assigned to this class');
    }

    // Verify coach is active in the gym
    const isCoachActive = await this.gymStaffService.isCoachAssignedToClass(
      command.userId,
      command.classId,
      classEntity.gymId,
    );
    if (!isCoachActive) {
      throw new ForbiddenException('Coach is not active for this gym');
    }

    // Precondition 2: Verify class exists and state is in_progress or completed
    // (Implicitly also verifies class is not archived, since archived is neither in_progress nor completed)
    if (
      classEntity.state !== 'in_progress' &&
      classEntity.state !== 'completed'
    ) {
      throw new BadRequestException(
        'Attendance can only be marked while class is in progress or completed',
      );
    }

    // Precondition 4: At least one attendance record must be provided
    if (command.attendanceRecords.length === 0) {
      throw new BadRequestException(
        'At least one attendance record is required',
      );
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

      let wasPresent: boolean | null = null;

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
        // Track status change for potential waitlist promotion
        wasPresent = attendance.present;

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

      // State Change: If status changed from present to absent, promote from waitlist
      if (wasPresent === true && attendance.present === false) {
        await this.promoteFirstWaitlistedBooking(command.classId);
      }
    }

    return {
      classId: command.classId,
      attendanceRecords: markedRecords,
    };
  }

  /**
   * PromoteWaitlist (internal/automatic when athlete marked absent)
   *
   * Promotes first waitlisted athlete to booked status.
   */
  private async promoteFirstWaitlistedBooking(classId: string): Promise<void> {
    const firstWaitlisted =
      await this.bookingRepository.getFirstWaitlistedBooking(classId);
    if (!firstWaitlisted) {
      // No waitlisted athletes; nothing to promote
      return;
    }

    // Promote first waitlisted to booked
    firstWaitlisted.status = 'booked';
    firstWaitlisted.bookedPosition = null;
    await this.bookingRepository.save(firstWaitlisted);

    // Renumber remaining waitlist positions
    const remainingWaitlisted =
      await this.bookingRepository.getWaitlistedBookingsByClass(classId);

    for (let i = 0; i < remainingWaitlisted.length; i++) {
      remainingWaitlisted[i].bookedPosition = i + 1;
    }

    if (remainingWaitlisted.length > 0) {
      await this.bookingDbRepository.save(remainingWaitlisted);
    }
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
