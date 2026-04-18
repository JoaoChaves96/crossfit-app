import { ICommand } from '@nestjs/cqrs';

export class ManuallyTransitionClassStateCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly classId: string,
    readonly targetState:
      | 'published'
      | 'booking_closed'
      | 'in_progress'
      | 'completed'
      | 'archived',
  ) {}
}
