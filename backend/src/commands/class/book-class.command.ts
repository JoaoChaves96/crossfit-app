import { ICommand } from '@nestjs/cqrs';

export class BookClassCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly classId: string,
    readonly gymId: string,
  ) {}
}
