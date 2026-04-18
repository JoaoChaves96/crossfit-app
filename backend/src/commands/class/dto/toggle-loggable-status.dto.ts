import { IsUUID } from 'class-validator';

export class ToggleLoggableStatusDto {
  @IsUUID()
  classId: string;
}
