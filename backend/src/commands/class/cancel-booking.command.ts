import { ICommand } from '@nestjs/cqrs';

export class CancelBookingCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly bookingId: string,
    readonly gymId: string,
  ) {}
}
