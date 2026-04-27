import { ApiProperty } from '@nestjs/swagger';

export class AddOrEditProgrammingResponseDto {
  @ApiProperty({ example: 'uuid-programming-id' })
  id: string;

  @ApiProperty({ example: 'uuid-class-id' })
  classId: string;

  @ApiProperty({ example: '5 rounds: 20 box jumps, 15 pull-ups, 10 burpees. For time.' })
  content: string;

  @ApiProperty({ example: 'uuid-coach-user-id' })
  createdByUserId: string;

  @ApiProperty({ example: '2024-06-14T18:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-06-14T19:00:00.000Z' })
  lastModifiedAt: Date;

  @ApiProperty({ example: 'uuid-coach-user-id', nullable: true })
  lastModifiedByUserId: string | null;
}
