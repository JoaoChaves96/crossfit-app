import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({
    example: 'ok',
    description: 'Always "ok" when the response is 200.',
  })
  status: 'ok';

  @ApiProperty({
    example: 'up',
    description: 'Result of a SELECT 1 against the application database.',
  })
  database: 'up';
}
