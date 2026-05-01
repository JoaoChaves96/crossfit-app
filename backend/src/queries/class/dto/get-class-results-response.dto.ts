import { ApiProperty } from '@nestjs/swagger';
import { ClassResultItemDto } from './class-result-item.dto';

/**
 * GetClassResultsResponseDto: Response for GET /api/gyms/:gymId/classes/:classId/results
 *
 * Returns all athlete results for a given class.
 * Accessible by coaches assigned to the class and gym owners.
 */
export class GetClassResultsResponseDto {
  @ApiProperty({
    type: [ClassResultItemDto],
    description: 'List of athlete results for the class',
  })
  results: ClassResultItemDto[];
}
