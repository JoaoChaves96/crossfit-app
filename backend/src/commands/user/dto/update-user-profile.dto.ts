import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateUserProfileDto {
  @ApiProperty({ description: 'New display name for the user', minLength: 1 })
  @IsString()
  @MinLength(1)
  name: string;
}
