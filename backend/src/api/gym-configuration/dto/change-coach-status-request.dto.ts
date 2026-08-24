import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ChangeCoachStatusRequestDto {
  @ApiProperty({
    enum: ['active', 'inactive'],
    example: 'inactive',
    description:
      'Set inactive to cut the coach off from this gym, active to let them back in. Required — a body without it is a 400, not a no-op.',
  })
  @IsIn(['active', 'inactive'])
  status: 'active' | 'inactive';
}
