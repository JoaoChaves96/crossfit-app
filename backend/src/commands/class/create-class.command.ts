import { ICommand } from '@nestjs/cqrs';

export class CreateClassCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly classTypeId: string,
    readonly coachUserId: string,
    readonly spaceId: string,
    readonly scheduledDate: Date,
    readonly scheduledTime: string,
    readonly capacity?: number,
    readonly duration?: number,
  ) {}
}
