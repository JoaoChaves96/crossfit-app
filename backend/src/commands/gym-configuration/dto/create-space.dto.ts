import { IsString, IsInt, Min } from 'class-validator';

export class CreateSpaceDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  baseCapacity: number;
}
