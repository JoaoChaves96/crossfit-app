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

export class EditResultDto {
  @ApiProperty({ example: 'uuid-result-id' })
  @IsUUID()
  resultId: string;

  @ApiProperty({ enum: MetricType, example: MetricType.TIME, required: false })
  @IsOptional()
  @IsEnum(MetricType)
  metricType?: MetricType;

  @ApiProperty({ example: '280', required: false })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiProperty({ enum: Unit, example: Unit.SECONDS, required: false })
  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;

  @ApiProperty({ example: 'Felt better this time', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
