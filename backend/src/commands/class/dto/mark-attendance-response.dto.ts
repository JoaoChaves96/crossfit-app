import { ApiProperty } from '@nestjs/swagger';

export class AttendanceRecordResponseDto {
  @ApiProperty({ example: 'uuid-attendance-id' })
  id: string;

  @ApiProperty({ example: 'uuid-class-id' })
  classId: string;

  @ApiProperty({ example: 'uuid-athlete-user-id' })
  userId: string;

  @ApiProperty({ example: true })
  present: boolean;

  @ApiProperty({ example: '2024-06-15T07:30:00.000Z' })
  markedAt: Date;

  @ApiProperty({ example: 'uuid-coach-user-id' })
  markedByUserId: string;

  @ApiProperty({ type: String, example: 'Arrived late', nullable: true })
  notes: string | null;
}

export class MarkAttendanceResponseDto {
  @ApiProperty({ example: 'uuid-class-id' })
  classId: string;

  @ApiProperty({ type: [AttendanceRecordResponseDto] })
  attendanceRecords: AttendanceRecordResponseDto[];
}
