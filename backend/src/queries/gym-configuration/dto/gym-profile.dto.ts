import { ApiProperty } from '@nestjs/swagger';

export class GymProfileDto {
  @ApiProperty({
    example: 'uuid-gym-id',
    description: 'Unique identifier for the gym',
  })
  id: string;

  @ApiProperty({
    example: 'CrossFit Downtown',
    description: 'Name of the gym',
  })
  name: string;

  @ApiProperty({
    example: 'A community-driven CrossFit box focused on functional fitness.',
    description: 'Optional description of the gym',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    example: '123 Main St, New York, NY',
    description: 'Physical location of the gym',
  })
  location: string;

  @ApiProperty({
    example: 'active',
    enum: ['active', 'pending_approval', 'suspended'],
    description: 'Current lifecycle status of the gym',
  })
  status: 'active' | 'pending_approval' | 'suspended';

  @ApiProperty({
    example: '2024-01-15T10:00:00.000Z',
    description: 'Timestamp when the gym was created',
  })
  createdAt: Date;
}
