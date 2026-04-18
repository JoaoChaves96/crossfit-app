import { ICommand } from '@nestjs/cqrs';

export class CreateSpaceCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly name: string,
    readonly baseCapacity: number,
  ) {}
}
