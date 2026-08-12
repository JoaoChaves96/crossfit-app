import { ICommand } from '@nestjs/cqrs';

export class AssignMembershipPlanCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly gymMembershipId: string,
    readonly membershipPlanId: string,
  ) {}
}
