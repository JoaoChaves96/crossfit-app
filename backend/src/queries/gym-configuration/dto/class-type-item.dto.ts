import { ApiProperty } from '@nestjs/swagger';

export class ClassTypeItemDto {
  @ApiProperty({
    example: 'uuid-class-type-id',
    description: 'Unique identifier for the class type',
  })
  id: string;

  @ApiProperty({
    example: 'CrossFit',
    description: 'Name of the class type',
  })
  name: string;

  @ApiProperty({
    example: true,
    description: 'Whether athletes can log results for this class type',
  })
  loggable: boolean;

  @ApiProperty({
    enum: ['time', 'reps', 'weight', 'rounds', 'none'],
    example: 'time',
    description: 'The metric used to log results for this class type',
  })
  resultMetrics: 'time' | 'reps' | 'weight' | 'rounds' | 'none';
}
