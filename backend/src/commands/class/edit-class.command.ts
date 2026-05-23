import { ICommand } from '@nestjs/cqrs';

export class EditClassCommand implements ICommand {
  constructor(
    readonly gymId: string,
    readonly classId: string,
    readonly classTypeId?: string,
    readonly coachUserId?: string,
    readonly spaceId?: string,
    readonly scheduledDate?: Date,
    readonly scheduledTime?: string,
    readonly capacity?: number,
    readonly duration?: number,
  ) {}
}
