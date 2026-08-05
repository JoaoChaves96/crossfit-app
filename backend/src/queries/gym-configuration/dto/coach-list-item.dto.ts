import { ApiProperty } from '@nestjs/swagger';

export class CoachListItemDto {
  @ApiProperty({
    example: 'uuid-staff-id',
    description: 'Unique identifier for the gym staff record',
  })
  id: string;

  @ApiProperty({ example: 'uuid-user-id', description: 'User ID of the coach' })
  userId: string;

  @ApiProperty({
    example: 'Carlos Silva',
    description: 'Display name of the coach',
  })
  name: string;

  @ApiProperty({
    example: 'coach@example.com',
    description: 'Email address of the coach',
  })
  email: string;

  @ApiProperty({
    enum: ['owner', 'coach'],
    example: 'coach',
    description: 'Role of the staff member in the gym',
  })
  role: 'owner' | 'coach';

  @ApiProperty({
    enum: ['active', 'inactive'],
    example: 'active',
    description: 'Current status of the coach in the gym',
  })
  status: 'active' | 'inactive';

  @ApiProperty({
    example: '2024-01-15T10:00:00.000Z',
    description: 'Date and time the coach was assigned to the gym',
  })
  assignedAt: Date;

  @ApiProperty({
    type: [String],
    example: ['CrossFit WOD', 'Gymnastics'],
    description:
      'Distinct class-type names of all non-deleted classes assigned to this coach within this gym, sorted alphabetically. Empty array when the coach has no classes.',
  })
  classesAssigned: string[];
}
