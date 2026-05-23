import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { DeleteClassCommand } from '../delete-class.command';
import { DeleteClassResponseDto } from '../dto/delete-class-response.dto';
import { ClassRepository } from '../../../repositories/class.repository';
import { notFound, invalidState } from '../../../http/exceptions';

@CommandHandler(DeleteClassCommand)
export class DeleteClassHandler implements ICommandHandler<DeleteClassCommand> {
  constructor(
    @Inject(ClassRepository) private readonly classRepository: ClassRepository,
  ) {}

  async execute(command: DeleteClassCommand): Promise<DeleteClassResponseDto> {
    const cls = await this.classRepository.getClassById(
      command.classId,
      command.gymId,
    );

    if (!cls) {
      throw notFound(`Class ${command.classId} not found in gym ${command.gymId}`);
    }

    if (cls.state !== 'published') {
      throw invalidState('Only published classes can be deleted');
    }

    const deletedAt = new Date();
    cls.deletedAt = deletedAt;
    cls.lastModifiedAt = deletedAt;

    await this.classRepository.save(cls);

    return {
      id: cls.id,
      deletedAt,
    };
  }
}
