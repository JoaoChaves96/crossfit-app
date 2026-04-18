import { ICommand } from '@nestjs/cqrs';

export class UpdateClassStructureCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly classId: string,
    readonly capacity?: number,
    readonly spaceId?: string,
  ) {}
}
