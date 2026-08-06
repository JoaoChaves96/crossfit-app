import { ApiProperty } from '@nestjs/swagger';

export class CreateRecurringClassesResponseDto {
  @ApiProperty({
    type: String,
    example: 'uuid-series-id',
    nullable: true,
    description: 'The created series id, or null when no classes were created.',
  })
  seriesId: string | null;

  @ApiProperty({ example: 24, description: 'Number of classes created.' })
  created: number;

  @ApiProperty({ example: 2, description: 'Occurrences skipped for being in the past.' })
  skippedPast: number;

  @ApiProperty({ example: 1, description: 'Occurrences skipped as exact duplicates.' })
  skippedDuplicate: number;
}
