import { ICommand } from '@nestjs/cqrs';

export class UpdateMembershipPlanCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly membershipPlanId: string,
    readonly name?: string,
    readonly pricing?: number,
    readonly billingCycle?: 'monthly' | 'annual',
    readonly classTypes?: string[],
  ) {}
}
