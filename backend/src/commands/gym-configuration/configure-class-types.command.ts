import { ICommand } from '@nestjs/cqrs';

export class ConfigureClassTypesCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly gymId: string,
    readonly operation: 'create' | 'update' | 'delete',
    readonly classTypeId?: string,
    readonly name?: string,
    readonly loggable?: boolean,
    readonly resultMetrics?: 'time' | 'reps' | 'weight' | 'rounds' | 'none',
  ) {}
}
