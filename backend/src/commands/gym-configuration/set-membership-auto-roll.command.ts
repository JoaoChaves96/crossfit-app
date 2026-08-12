import { ICommand } from '@nestjs/cqrs';

export class SetMembershipAutoRollCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly gymMembershipId: string,
    readonly autoRoll: boolean,
  ) {}
}
