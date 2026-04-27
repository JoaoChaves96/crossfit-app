import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateGymDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  location: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}
