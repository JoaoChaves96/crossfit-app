import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
  Inject,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { GymOwnershipGuard } from '../../auth/guards/gym-ownership.guard';
import { Role } from '../../auth/decorators/role.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CreateClassDto } from '../../commands/class/dto/create-class.dto';
import { CreateClassCommand } from '../../commands/class/create-class.command';
import { CreateClassResponseDto } from '../../commands/class/dto/create-class-response.dto';
import { CreateRecurringClassesDto } from '../../commands/class/dto/create-recurring-classes.dto';
import { CreateRecurringClassesCommand } from '../../commands/class/create-recurring-classes.command';
import { CreateRecurringClassesResponseDto } from '../../commands/class/dto/create-recurring-classes-response.dto';
import { EditClassDto } from '../../commands/class/dto/edit-class.dto';
import { EditClassCommand } from '../../commands/class/edit-class.command';
import { EditClassResponseDto } from '../../commands/class/dto/edit-class-response.dto';
import { DeleteClassCommand } from '../../commands/class/delete-class.command';
import { DeleteClassResponseDto } from '../../commands/class/dto/delete-class-response.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ClassScheduleService } from '../../queries/class/class-schedule.service';
import { GetClassScheduleResponseDto } from '../../queries/class/dto/get-class-schedule-response.dto';
import { ClassScheduleItemDto } from '../../queries/class/dto/class-schedule-item.dto';

@Controller('/api/gyms/:gymId/classes')
@ApiTags('Classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, GymOwnershipGuard, RolesGuard)
export class ClassSchedulingController {
  constructor(
    @Inject(CommandBus) private readonly commandBus: CommandBus,
    private readonly classScheduleService: ClassScheduleService,
  ) {}

  @Get()
  @Role(['athlete', 'owner', 'coach'])
  @ApiOperation({
    summary: 'Get class schedule',
    description:
      'Retrieve all classes in a gym. For athletes, classes are filtered by gym membership and membership plan visibility. Gym owners and coaches can view all classes in their gym.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiResponse({
    status: 200,
    description: 'Class schedule returned',
    type: GetClassScheduleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Athlete, owner, or coach role required',
  })
  async getClassSchedule(
    @Param('gymId') gymId: string,
    @CurrentUser() userId: string,
  ): Promise<GetClassScheduleResponseDto> {
    return this.classScheduleService.getClassScheduleForAthlete(gymId, userId);
  }

  @Get('/:classId')
  @Role(['coach', 'owner'])
  @ApiOperation({
    summary: 'Get a single class by ID',
    description:
      'Retrieve the detail of a single class scoped to the gym. Accessible by coaches and gym owners. Returns 404 if the class does not exist or does not belong to the gym.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({
    status: 200,
    description: 'Class detail returned',
    type: ClassScheduleItemDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Coach or owner role required',
  })
  @ApiResponse({ status: 404, description: 'Class not found in gym' })
  async getClassDetail(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
  ): Promise<ClassScheduleItemDto> {
    return this.classScheduleService.getClassDetail(gymId, classId);
  }

  @Post()
  @Role('owner')
  @ApiOperation({
    summary: 'Create a new class',
    description:
      'Schedule a new training session. Only gym owners can create classes.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiBody({ type: CreateClassDto })
  @ApiResponse({
    status: 201,
    description: 'Class created',
    type: CreateClassResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async createClass(
    @Param('gymId') gymId: string,
    @Body(ValidationPipe) createClassDto: CreateClassDto,
    @CurrentUser() userId: string,
  ): Promise<CreateClassResponseDto> {
    const command = new CreateClassCommand(
      userId,
      gymId,
      createClassDto.classTypeId,
      createClassDto.coachUserId,
      createClassDto.spaceId,
      // Passed through as the bare 'YYYY-MM-DD' the client sent. Wrapping it in
      // `new Date()` here is what used to shift the stored day west of UTC.
      createClassDto.scheduledDate,
      createClassDto.scheduledTime,
      createClassDto.capacity,
      createClassDto.duration,
    );

    return this.commandBus.execute(command);
  }

  @Post('/recurring')
  @Role('owner')
  @ApiOperation({
    summary: 'Create a recurring series of classes',
    description:
      'Generate multiple classes from a weekly recurrence rule (weekdays + shared time, bounded by an end date within 6 months). Skips past and exact-duplicate occurrences and returns a summary. Only gym owners can create classes.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiBody({ type: CreateRecurringClassesDto })
  @ApiResponse({
    status: 201,
    description: 'Series generated',
    type: CreateRecurringClassesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid rule (bad range, >6 months, etc.)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async createRecurringClasses(
    @Param('gymId') gymId: string,
    @Body(ValidationPipe) dto: CreateRecurringClassesDto,
    @CurrentUser() userId: string,
  ): Promise<CreateRecurringClassesResponseDto> {
    return this.commandBus.execute(
      new CreateRecurringClassesCommand(userId, gymId, dto),
    );
  }

  @Patch('/:classId')
  @Role('owner')
  @ApiOperation({
    summary: 'Edit a published class',
    description:
      'Partially update a published class. Only gym owners can edit classes. Only classes in published state can be edited. All body fields are optional.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiBody({ type: EditClassDto })
  @ApiResponse({
    status: 200,
    description: 'Class updated',
    type: EditClassResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Class is not in published state or validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  @ApiResponse({ status: 404, description: 'Class not found in gym' })
  async editClass(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @Body(ValidationPipe) editClassDto: EditClassDto,
  ): Promise<EditClassResponseDto> {
    const command = new EditClassCommand(
      gymId,
      classId,
      editClassDto.classTypeId,
      editClassDto.coachUserId,
      editClassDto.spaceId,
      editClassDto.scheduledDate,
      editClassDto.scheduledTime,
      editClassDto.capacity,
      editClassDto.duration,
    );

    return this.commandBus.execute(command);
  }

  @Delete('/:classId')
  @Role('owner')
  @ApiOperation({
    summary: 'Soft-delete a published class',
    description:
      'Soft-delete a class by setting its deletedAt timestamp. Only gym owners can delete classes. Only classes in published state can be deleted.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({
    status: 200,
    description: 'Class soft-deleted',
    type: DeleteClassResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Class is not in published state' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  @ApiResponse({ status: 404, description: 'Class not found in gym' })
  async deleteClass(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
  ): Promise<DeleteClassResponseDto> {
    const command = new DeleteClassCommand(gymId, classId);

    return this.commandBus.execute(command);
  }
}
