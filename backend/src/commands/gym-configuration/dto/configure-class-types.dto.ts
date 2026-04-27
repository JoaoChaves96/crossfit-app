import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfigureClassTypesDto {
  @ApiProperty({ enum: ['create', 'update', 'delete'], example: 'create' })
  @IsEnum(['create', 'update', 'delete'])
  operation: 'create' | 'update' | 'delete';

  @ApiProperty({ example: 'uuid-class-type-id', required: false, description: 'Required for update and delete operations' })
  @ValidateIf(
    (o: ConfigureClassTypesDto) =>
      o.operation === 'update' || o.operation === 'delete',
  )
  @IsString()
  classTypeId?: string;

  @ApiProperty({ example: 'CrossFit', required: false, description: 'Required for create; optional for update' })
  @ValidateIf(
    (o: ConfigureClassTypesDto) =>
      o.operation === 'create' || o.operation === 'update',
  )
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  loggable?: boolean;

  @ApiProperty({ enum: ['time', 'reps', 'weight', 'rounds', 'none'], example: 'time', required: false })
  @IsOptional()
  @IsEnum(['time', 'reps', 'weight', 'rounds', 'none'])
  resultMetrics?: 'time' | 'reps' | 'weight' | 'rounds' | 'none';
}
