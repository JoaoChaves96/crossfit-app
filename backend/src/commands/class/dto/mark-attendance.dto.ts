import {
  IsUUID,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsString,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AttendanceRecordDto {
  @IsUUID()
  athleteUserId: string;

  @IsBoolean()
  present: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class MarkAttendanceDto {
  @IsUUID()
  classId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  attendanceRecords: AttendanceRecordDto[];
}
