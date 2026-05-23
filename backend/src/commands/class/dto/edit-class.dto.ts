import { PartialType } from '@nestjs/swagger';
import { BaseClassDto } from './base-class.dto';

export class EditClassDto extends PartialType(BaseClassDto) {}
