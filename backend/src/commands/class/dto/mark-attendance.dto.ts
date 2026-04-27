import {
  IsUUID,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsString,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AttendanceRecordDto {
  @ApiProperty({ example: 'uuid-athlete-user-id' })
  @IsUUID()
  athleteUserId: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  present: boolean;

  @ApiProperty({ example: 'Arrived late', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class MarkAttendanceDto {
  @ApiProperty({ example: 'uuid-class-id' })
  @IsUUID()
  classId: string;

  @ApiProperty({ type: [AttendanceRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  attendanceRecords: AttendanceRecordDto[];
}
