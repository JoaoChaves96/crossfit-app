import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class SetGymMembershipStatusRequestDto {
  @ApiProperty({
    enum: ['active', 'inactive'],
    example: 'inactive',
    description:
      'Set inactive to suspend the member, active to resume them. The member’s plan is unaffected either way.',
  })
  @IsIn(['active', 'inactive'])
  status: 'active' | 'inactive';
}
