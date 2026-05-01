import { ICommand } from '@nestjs/cqrs';

export interface AttendanceRecord {
  athleteUserId: string;
  present: boolean;
  notes?: string;
}

export class MarkAttendanceCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly classId: string,
    readonly gymId: string,
    readonly attendanceRecords: AttendanceRecord[],
  ) {}
}
