import { IsUUID, IsEnum, IsString, IsOptional } from 'class-validator';

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
  @IsUUID()
  classId: string;

  @IsEnum(MetricType)
  metricType: MetricType;

  @IsString()
  value: string;

  @IsEnum(Unit)
  unit: Unit;

  @IsOptional()
  @IsString()
  notes?: string;
}
