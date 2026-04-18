import { ICommand } from '@nestjs/cqrs';

export class CreateMembershipPlanCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly name: string,
    readonly pricing: number,
    readonly billingCycle: 'monthly' | 'annual',
    readonly classTypes: string[],
  ) {}
}
