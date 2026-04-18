import { ICommand } from '@nestjs/cqrs';

export class ChangeCoachStatusCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly coachUserId: string,
    readonly status: 'active' | 'inactive',
  ) {}
}
