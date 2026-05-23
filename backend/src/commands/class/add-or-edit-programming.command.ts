import { ICommand } from '@nestjs/cqrs';

export class AddOrEditProgrammingCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly classId: string,
    readonly gymId: string,
    readonly content: string,
    readonly loggable?: boolean,
  ) {}
}
