import { IsUUID, IsString, IsBoolean, IsOptional } from 'class-validator';

export class AddOrEditProgrammingDto {
  @IsUUID()
  classId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  loggable?: boolean;
}
