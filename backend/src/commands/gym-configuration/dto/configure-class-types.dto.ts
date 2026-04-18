import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  ValidateIf,
} from 'class-validator';

export class ConfigureClassTypesDto {
  @IsEnum(['create', 'update', 'delete'])
  operation: 'create' | 'update' | 'delete';

  @ValidateIf(
    (o: ConfigureClassTypesDto) =>
      o.operation === 'update' || o.operation === 'delete',
  )
  @IsString()
  classTypeId?: string;

  @ValidateIf(
    (o: ConfigureClassTypesDto) =>
      o.operation === 'create' || o.operation === 'update',
  )
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  loggable?: boolean;

  @IsOptional()
  @IsEnum(['time', 'reps', 'weight', 'rounds', 'none'])
  resultMetrics?: 'time' | 'reps' | 'weight' | 'rounds' | 'none';
}
