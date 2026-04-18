import { ICommand } from '@nestjs/cqrs';

export class InviteCoachCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly coachEmail: string,
  ) {}
}
