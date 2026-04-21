import { ICommand } from '@nestjs/cqrs';

export class CreateGymCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly name: string,
    readonly location: string,
    readonly description: string | undefined,
  ) {}
}
