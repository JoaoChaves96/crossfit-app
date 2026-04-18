export class AttendanceRecordResponseDto {
  id: string;
  classId: string;
  userId: string;
  present: boolean;
  markedAt: Date;
  markedByUserId: string;
  notes: string | null;
}

export class MarkAttendanceResponseDto {
  classId: string;
  attendanceRecords: AttendanceRecordResponseDto[];
}
