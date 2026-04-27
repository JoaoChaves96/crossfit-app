import { ApiProperty } from '@nestjs/swagger';

export class LogResultResponseDto {
  @ApiProperty({ example: 'uuid-result-id' })
  id: string;

  @ApiProperty({ example: 'uuid-class-id' })
  classId: string;

  @ApiProperty({ example: 'uuid-user-id' })
  userId: string;

  @ApiProperty({ enum: ['time', 'reps', 'weight', 'rounds', 'note'], example: 'time' })
  metricType: 'time' | 'reps' | 'weight' | 'rounds' | 'note';

  @ApiProperty({ example: '300' })
  value: string;

  @ApiProperty({ enum: ['seconds', 'minutes', 'reps', 'kg', 'lb', 'rounds', 'none'], example: 'seconds' })
  unit: 'seconds' | 'minutes' | 'reps' | 'kg' | 'lb' | 'rounds' | 'none';

  @ApiProperty({ example: 'Felt strong today', nullable: true })
  notes: string | null;

  @ApiProperty({ example: '2024-06-15T09:00:00.000Z' })
  loggedAt: Date;

  @ApiProperty({ example: null, nullable: true })
  editedAt: Date | null;
}
