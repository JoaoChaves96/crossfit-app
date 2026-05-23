import { ApiProperty } from '@nestjs/swagger';
import { TrainingHistoryItemDto } from './training-history-item.dto';

/**
 * GetTrainingHistoryResponseDto: Response for GET /api/gyms/:gymId/athletes/me/history
 *
 * Returns past attended classes (completed or archived) for the authenticated athlete,
 * ordered by scheduled date descending, with the logged result if one exists.
 */
export class GetTrainingHistoryResponseDto {
  @ApiProperty({
    type: [TrainingHistoryItemDto],
    description:
      "Ordered list of the athlete's past attended classes (most recent first)",
  })
  history: TrainingHistoryItemDto[];
}
