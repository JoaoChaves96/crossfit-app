import { ICommand } from '@nestjs/cqrs';

export class DeleteClassCommand implements ICommand {
  constructor(
    readonly gymId: string,
    readonly classId: string,
  ) {}
}
