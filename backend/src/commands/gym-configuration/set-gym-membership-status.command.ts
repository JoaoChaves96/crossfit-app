import { ICommand } from '@nestjs/cqrs';

export class SetGymMembershipStatusCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly gymMembershipId: string,
    readonly status: 'active' | 'inactive',
  ) {}
}
