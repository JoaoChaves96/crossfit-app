import { ICommand } from '@nestjs/cqrs';

export class UpdateUserProfileCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly name: string,
  ) {}
}
