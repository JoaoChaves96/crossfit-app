import { ICommand } from '@nestjs/cqrs';

export class ExtendMembershipCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly gymMembershipId: string,
    readonly expiresAt: Date,
  ) {}
}
