import { ICommand } from '@nestjs/cqrs';

export class UpdateGymProfileCommand implements ICommand {
  constructor(
    readonly gymId: string,
    readonly name?: string,
    readonly description?: string,
    readonly location?: string,
  ) {}
}
