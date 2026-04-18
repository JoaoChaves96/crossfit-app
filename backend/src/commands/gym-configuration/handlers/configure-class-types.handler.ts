import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ConfigureClassTypesCommand } from '../configure-class-types.command';
import { GymService } from '../../../domain/gym/gym.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { ClassTypeService } from '../../../domain/class-type/class-type.service';
import { ConfigureClassTypesResponseDto } from '../dto/configure-class-types-response.dto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassTypeEntity } from '../../../domain/class-type/entities/class-type.entity';
import { ClassEntity } from '../../../domain/class/entities/class.entity';
import { v4 as uuid } from 'uuid';

/**
 * ConfigureClassTypesHandler: Orchestrates class type management
 *
 * Responsibilities:
 * - Enforce all preconditions from COMMAND_MODEL.md
 * - Create, update, or delete ClassTypeEntity
 * - Persist via repository
 *
 * COMMAND_MODEL.md reference: ConfigureClassTypes command specification
 */
@CommandHandler(ConfigureClassTypesCommand)
export class ConfigureClassTypesHandler implements ICommandHandler<ConfigureClassTypesCommand> {
  constructor(
    @Inject(GymService) private readonly gymService: GymService,
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @Inject(ClassTypeService)
    private readonly classTypeService: ClassTypeService,
    @InjectRepository(ClassTypeEntity)
    private readonly classTypeRepository: Repository<ClassTypeEntity>,
    @InjectRepository(ClassEntity)
    private readonly classRepository: Repository<ClassEntity>,
  ) {}

  async execute(
    command: ConfigureClassTypesCommand,
  ): Promise<ConfigureClassTypesResponseDto> {
    // Precondition 1: Verify user is gym owner
    const isOwner = await this.gymStaffService.isGymOwner(
      command.userId,
      command.gymId,
    );
    if (!isOwner) {
      throw new ForbiddenException('User is not a gym owner for this gym');
    }

    // Precondition 2: Verify gym exists and is active
    const gym = await this.gymService.getGymById(command.gymId);
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
    if (gym.status !== 'active') {
      throw new BadRequestException('Gym is not active');
    }

    // Handle based on operation
    if (command.operation === 'create') {
      return this.handleCreate(command);
    } else if (command.operation === 'update') {
      return this.handleUpdate(command);
    } else if (command.operation === 'delete') {
      return this.handleDelete(command);
    } else {
      throw new BadRequestException('Invalid operation');
    }
  }

  private async handleCreate(
    command: ConfigureClassTypesCommand,
  ): Promise<ConfigureClassTypesResponseDto> {
    // Precondition: name is required for create
    if (!command.name) {
      throw new BadRequestException('Name is required for create operation');
    }

    // Precondition: name is unique per gym
    const existingTypes = await this.classTypeService.getClassTypesByGym(
      command.gymId,
    );
    const nameExists = existingTypes.some((ct) => ct.name === command.name);
    if (nameExists) {
      throw new BadRequestException(
        'Class type with this name already exists in this gym',
      );
    }

    // Create ClassTypeEntity
    const classType = new ClassTypeEntity();
    classType.id = uuid();
    classType.gymId = command.gymId;
    classType.name = command.name;
    classType.loggable = command.loggable ?? false;
    classType.resultMetrics = command.resultMetrics ?? 'none';
    classType.deletedAt = null;

    // Persist
    const saved = await this.classTypeRepository.save(classType);
    return this.mapToResponseDto(saved);
  }

  private async handleUpdate(
    command: ConfigureClassTypesCommand,
  ): Promise<ConfigureClassTypesResponseDto> {
    // Precondition: classTypeId is required for update
    if (!command.classTypeId) {
      throw new BadRequestException(
        'classTypeId is required for update operation',
      );
    }

    // Precondition: class type exists and belongs to gym
    const classType = await this.classTypeService.getClassTypeById(
      command.classTypeId,
    );
    if (!classType) {
      throw new NotFoundException('Class type not found');
    }
    if (classType.gymId !== command.gymId) {
      throw new BadRequestException('Class type does not belong to this gym');
    }

    // Precondition: if name is changed, verify uniqueness
    if (command.name !== undefined && command.name !== classType.name) {
      const existingTypes = await this.classTypeService.getClassTypesByGym(
        command.gymId,
      );
      const nameExists = existingTypes.some(
        (ct) => ct.name === command.name && ct.id !== command.classTypeId,
      );
      if (nameExists) {
        throw new BadRequestException(
          'Class type with this name already exists in this gym',
        );
      }
      classType.name = command.name;
    }

    // Update optional fields
    if (command.loggable !== undefined) {
      classType.loggable = command.loggable;
    }
    if (command.resultMetrics !== undefined) {
      classType.resultMetrics = command.resultMetrics;
    }

    // Persist
    const saved = await this.classTypeRepository.save(classType);
    return this.mapToResponseDto(saved);
  }

  private async handleDelete(
    command: ConfigureClassTypesCommand,
  ): Promise<ConfigureClassTypesResponseDto> {
    // Precondition: classTypeId is required for delete
    if (!command.classTypeId) {
      throw new BadRequestException(
        'classTypeId is required for delete operation',
      );
    }

    // Precondition: class type exists and belongs to gym
    const classType = await this.classTypeService.getClassTypeById(
      command.classTypeId,
    );
    if (!classType) {
      throw new NotFoundException('Class type not found');
    }
    if (classType.gymId !== command.gymId) {
      throw new BadRequestException('Class type does not belong to this gym');
    }

    // Precondition: no active classes reference this class type
    const activeClasses = await this.classRepository.find({
      where: [
        { classTypeId: command.classTypeId, state: 'published' },
        { classTypeId: command.classTypeId, state: 'booking_closed' },
        { classTypeId: command.classTypeId, state: 'in_progress' },
      ],
    });

    if (activeClasses.length > 0) {
      throw new BadRequestException(
        'Cannot delete class type with active classes',
      );
    }

    // Soft delete
    classType.deletedAt = new Date();

    // Persist
    const saved = await this.classTypeRepository.save(classType);
    return this.mapToResponseDto(saved);
  }

  private mapToResponseDto(
    classType: ClassTypeEntity,
  ): ConfigureClassTypesResponseDto {
    return {
      id: classType.id,
      gymId: classType.gymId,
      name: classType.name,
      loggable: classType.loggable,
      resultMetrics: classType.resultMetrics,
      deletedAt: classType.deletedAt,
    };
  }
}
