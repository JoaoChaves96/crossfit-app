import { ApiProperty } from '@nestjs/swagger';

export class CreateGymResponseDto {
  @ApiProperty({ example: 'uuid-gym-id' })
  id: string;

  @ApiProperty({ example: 'CrossFit Downtown' })
  name: string;

  @ApiProperty({ example: 'Rua das Flores 123, São Paulo' })
  location: string;

  @ApiProperty({ example: 'A premium CrossFit gym.', nullable: true })
  description: string | null;

  @ApiProperty({ example: 'uuid-owner-user-id' })
  ownerId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}
