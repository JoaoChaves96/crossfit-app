import { ICommand } from '@nestjs/cqrs';

export class EditResultCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly resultId: string,
    readonly metricType?: 'time' | 'reps' | 'weight' | 'rounds' | 'note',
    readonly value?: string,
    readonly unit?:
      | 'seconds'
      | 'minutes'
      | 'reps'
      | 'kg'
      | 'lb'
      | 'rounds'
      | 'none',
    readonly notes?: string,
  ) {}
}
