import { ApiProperty } from '@nestjs/swagger';

export class DeleteClassResponseDto {
  @ApiProperty({
    example: 'uuid-class-id',
    description: 'Unique identifier of the deleted class',
  })
  id: string;

  @ApiProperty({
    example: '2024-06-15T10:00:00.000Z',
    description: 'Timestamp when the class was soft-deleted',
  })
  deletedAt: Date;
}
