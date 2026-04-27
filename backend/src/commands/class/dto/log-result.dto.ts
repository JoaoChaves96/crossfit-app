import { IsUUID, IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MetricType {
  TIME = 'time',
  REPS = 'reps',
  WEIGHT = 'weight',
  ROUNDS = 'rounds',
  NOTE = 'note',
}

export enum Unit {
  SECONDS = 'seconds',
  MINUTES = 'minutes',
  REPS = 'reps',
  KG = 'kg',
  LB = 'lb',
  ROUNDS = 'rounds',
  NONE = 'none',
}

export class LogResultDto {
  @ApiProperty({ example: 'uuid-class-id' })
  @IsUUID()
  classId: string;

  @ApiProperty({ enum: MetricType, example: MetricType.TIME })
  @IsEnum(MetricType)
  metricType: MetricType;

  @ApiProperty({ example: '300' })
  @IsString()
  value: string;

  @ApiProperty({ enum: Unit, example: Unit.SECONDS })
  @IsEnum(Unit)
  unit: Unit;

  @ApiProperty({ example: 'Felt strong today', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
