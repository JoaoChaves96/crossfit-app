import { IsUUID } from 'class-validator';

export class BookClassDto {
  @IsUUID()
  classId: string;

  @IsUUID()
  gymId: string;
}
