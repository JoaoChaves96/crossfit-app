import { ICommand } from '@nestjs/cqrs';

export class ToggleLoggableStatusCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly classId: string,
    readonly gymId: string,
  ) {}
}
