import { ICommand } from '@nestjs/cqrs';

export class ManuallyAddMemberCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly athleteUserId: string,
    readonly membershipPlanId?: string,
  ) {}
}
