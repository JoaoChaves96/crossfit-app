import { ApiProperty } from '@nestjs/swagger';

export class ConfigureClassTypesResponseDto {
  @ApiProperty({ example: 'uuid-class-type-id' })
  id: string;

  @ApiProperty({ example: 'uuid-gym-id' })
  gymId: string;

  @ApiProperty({ example: 'CrossFit' })
  name: string;

  @ApiProperty({ example: true })
  loggable: boolean;

  @ApiProperty({
    enum: ['time', 'reps', 'weight', 'rounds', 'none'],
    example: 'time',
  })
  resultMetrics: 'time' | 'reps' | 'weight' | 'rounds' | 'none';

  @ApiProperty({ example: null, nullable: true })
  deletedAt: Date | null;
}
