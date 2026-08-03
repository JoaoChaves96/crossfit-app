import { ApiProperty } from '@nestjs/swagger';
import { ClassResultItemDto } from './class-result-item.dto';

/**
 * GetMyClassResultResponseDto: Response for
 * GET /api/gyms/:gymId/classes/:classId/results/me
 *
 * Returns the calling athlete's own result for the class, or null when no
 * result has been logged yet (the client renders a blank "log your result"
 * form in that case). Never exposes other athletes' results.
 */
export class GetMyClassResultResponseDto {
  @ApiProperty({
    type: ClassResultItemDto,
    nullable: true,
    description:
      "The caller's own result for this class, or null if none has been logged yet",
  })
  result: ClassResultItemDto | null;
}
