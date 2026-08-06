import { ICommand } from '@nestjs/cqrs';
import { CreateRecurringClassesDto } from './dto/create-recurring-classes.dto';

export class CreateRecurringClassesCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly dto: CreateRecurringClassesDto,
  ) {}
}
