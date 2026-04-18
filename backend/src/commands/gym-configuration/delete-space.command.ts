import { ICommand } from '@nestjs/cqrs';

export class DeleteSpaceCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly spaceId: string,
  ) {}
}
