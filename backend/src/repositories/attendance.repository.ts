import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceEntity } from '../domain/attendance/entities/attendance.entity';

/**
 * AttendanceRepository: Pure persistence layer for attendance records
 *
 * Responsibilities:
 * - Persist AttendanceEntity instances
 * - Query/retrieve AttendanceEntity instances
 * - Validate existence
 *
 * MUST NOT:
 * - Create domain entities
 * - Decide initial state or timestamps
 */
@Injectable()
export class AttendanceRepository {
  constructor(
    @InjectRepository(AttendanceEntity)
    private readonly attendanceRepository: Repository<AttendanceEntity>,
  ) {}

  /**
   * Persist an AttendanceEntity to the database
   */
  async save(attendanceEntity: AttendanceEntity): Promise<AttendanceEntity> {
    return this.attendanceRepository.save(attendanceEntity);
  }

  /**
   * Retrieve attendance record by ID
   */
  async getAttendanceById(
    attendanceId: string,
  ): Promise<AttendanceEntity | null> {
    return this.attendanceRepository.findOne({
      where: { id: attendanceId },
    });
  }

  /**
   * Retrieve attendance record for a specific user and class
   */
  async getAttendanceByUserAndClass(
    userId: string,
    classId: string,
  ): Promise<AttendanceEntity | null> {
    return this.attendanceRepository.findOne({
      where: { userId, classId },
    });
  }

  /**
   * Retrieve all attendance records for a class
   */
  async getAttendanceByClass(classId: string): Promise<AttendanceEntity[]> {
    return this.attendanceRepository.find({
      where: { classId },
      order: { markedAt: 'ASC' },
    });
  }

  /**
   * Retrieve all present attendance records for a class
   */
  async getPresentAttendanceByClass(
    classId: string,
  ): Promise<AttendanceEntity[]> {
    return this.attendanceRepository.find({
      where: { classId, present: true },
    });
  }

  /**
   * Count present attendees for a class
   */
  async countPresentByClass(classId: string): Promise<number> {
    return this.attendanceRepository.count({
      where: { classId, present: true },
    });
  }

  /**
   * Check if attendance record exists for user and class
   */
  async attendanceExists(userId: string, classId: string): Promise<boolean> {
    const count = await this.attendanceRepository.count({
      where: { userId, classId },
    });
    return count > 0;
  }
}
