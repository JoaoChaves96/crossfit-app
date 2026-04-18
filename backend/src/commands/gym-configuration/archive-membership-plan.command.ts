import { ICommand } from '@nestjs/cqrs';

export class ArchiveMembershipPlanCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly membershipPlanId: string,
  ) {}
}
