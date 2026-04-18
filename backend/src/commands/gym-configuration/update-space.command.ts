import { ICommand } from '@nestjs/cqrs';

export class UpdateSpaceCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly spaceId: string,
    readonly name?: string,
    readonly baseCapacity?: number,
  ) {}
}
