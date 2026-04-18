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

export class EditResultDto {
  @IsUUID()
  resultId: string;

  @IsOptional()
  @IsEnum(MetricType)
  metricType?: MetricType;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;

  @IsOptional()
  @IsString()
  notes?: string;
}
