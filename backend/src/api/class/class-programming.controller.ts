import {
  Controller,
  Get,
  Post,
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
import { AddOrEditProgrammingDto } from '../../commands/class/dto/add-or-edit-programming.dto';
import { AddOrEditProgrammingCommand } from '../../commands/class/add-or-edit-programming.command';
import { AddOrEditProgrammingResponseDto } from '../../commands/class/dto/add-or-edit-programming-response.dto';
import { ToggleLoggableStatusDto } from '../../commands/class/dto/toggle-loggable-status.dto';
import { ToggleLoggableStatusCommand } from '../../commands/class/toggle-loggable-status.command';
import { ToggleLoggableStatusResponseDto } from '../../commands/class/dto/toggle-loggable-status-response.dto';
import { ManuallyTransitionClassStateDto } from '../../commands/class/dto/manually-transition-class-state.dto';
import { ManuallyTransitionClassStateCommand } from '../../commands/class/manually-transition-class-state.command';
import { ManuallyTransitionClassStateResponseDto } from '../../commands/class/dto/manually-transition-class-state-response.dto';
import { UpdateClassStructureDto } from '../../commands/class/dto/update-class-structure.dto';
import { UpdateClassStructureCommand } from '../../commands/class/update-class-structure.command';
import { UpdateClassStructureResponseDto } from '../../commands/class/dto/update-class-structure-response.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { GetClassProgrammingService } from '../../queries/class/get-class-programming.service';
import { GetClassProgrammingResponseDto } from '../../queries/class/dto/get-class-programming-response.dto';

@Controller('/api/gyms/:gymId/classes')
@ApiTags('Classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, GymOwnershipGuard, RolesGuard)
export class ClassProgrammingController {
  constructor(
    @Inject(CommandBus) private readonly commandBus: CommandBus,
    private readonly getClassProgrammingService: GetClassProgrammingService,
  ) {}

  @Get('/:classId/programming')
  @Role(['coach', 'owner', 'athlete'])
  @ApiOperation({
    summary: 'Get class programming (WOD)',
    description:
      'Retrieve the workout programming for a class. Accessible by the assigned coach, the gym owner, or any athlete with active membership in the gym (WOD content is not per-athlete sensitive). Returns null content when no programming has been set. gymId is validated against the class.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({
    status: 200,
    description: 'Programming returned (content may be null if not yet set)',
    type: GetClassProgrammingResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Coach, owner, or gym member (athlete) role required',
  })
  @ApiResponse({ status: 404, description: 'Class not found in gym' })
  async getClassProgramming(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @CurrentUser() userId: string,
  ): Promise<GetClassProgrammingResponseDto> {
    return this.getClassProgrammingService.getClassProgramming(
      gymId,
      classId,
      userId,
    );
  }

  @Post('/:classId/programming')
  @Role(['coach', 'owner'])
  @ApiOperation({
    summary: 'Add or edit class programming',
    description:
      'Create or update workout content and loggable status for a class. The gym owner may edit programming for any class in their gym; a coach may edit only a class they are assigned to. Programming can be edited while the class is published or booking closed.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiBody({ type: AddOrEditProgrammingDto })
  @ApiResponse({
    status: 201,
    description: 'Programming saved',
    type: AddOrEditProgrammingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Class is not in published or booking_closed state, or request body is invalid',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - gymId mismatch, or caller is neither the gym owner nor the coach assigned to this class',
  })
  @ApiResponse({ status: 404, description: 'Class not found in gym' })
  async addOrEditProgramming(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @Body(ValidationPipe) addOrEditProgrammingDto: AddOrEditProgrammingDto,
    @CurrentUser() userId: string,
  ): Promise<AddOrEditProgrammingResponseDto> {
    if (addOrEditProgrammingDto.classId !== classId) {
      throw new Error('Class ID mismatch');
    }

    const command = new AddOrEditProgrammingCommand(
      userId,
      classId,
      gymId,
      addOrEditProgrammingDto.content,
      addOrEditProgrammingDto.loggable,
    );

    return this.commandBus.execute(command);
  }

  @Post('/:classId/toggle-loggable')
  @Role(['coach', 'owner'])
  @ApiOperation({
    summary: 'Toggle class loggable status',
    description:
      'Toggle whether athletes can log results for this class. The gym owner may toggle any class in their gym; a coach may toggle only a class they are assigned to. Editable while the class is published or booking closed.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiBody({ type: ToggleLoggableStatusDto })
  @ApiResponse({
    status: 201,
    description: 'Loggable status toggled',
    type: ToggleLoggableStatusResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Class is not in published or booking_closed state, or request body is invalid',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - gymId mismatch, or caller is neither the gym owner nor the coach assigned to this class',
  })
  @ApiResponse({ status: 404, description: 'Class not found in gym' })
  async toggleLoggableStatus(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @Body(ValidationPipe) toggleLoggableStatusDto: ToggleLoggableStatusDto,
    @CurrentUser() userId: string,
  ): Promise<ToggleLoggableStatusResponseDto> {
    if (toggleLoggableStatusDto.classId !== classId) {
      throw new Error('Class ID mismatch');
    }

    const command = new ToggleLoggableStatusCommand(userId, classId, gymId);

    return this.commandBus.execute(command);
  }

  @Post('/:classId/transition')
  @Role(['coach', 'owner'])
  @ApiOperation({
    summary: 'Manually transition class state',
    description:
      'Move a class to the next state in the lifecycle (published → booking_closed → in_progress → completed → archived). The assigned coach, or any active owner of the gym. State transitions are unidirectional.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiBody({ type: ManuallyTransitionClassStateDto })
  @ApiResponse({
    status: 201,
    description: 'Class state transitioned',
    type: ManuallyTransitionClassStateResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - caller is neither the assigned coach nor an active owner of the gym',
  })
  async manuallyTransitionClassState(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @Body(ValidationPipe)
    manuallyTransitionClassStateDto: ManuallyTransitionClassStateDto,
    @CurrentUser() userId: string,
  ): Promise<ManuallyTransitionClassStateResponseDto> {
    if (manuallyTransitionClassStateDto.classId !== classId) {
      throw new Error('Class ID mismatch');
    }

    const command = new ManuallyTransitionClassStateCommand(
      userId,
      classId,
      gymId,
      manuallyTransitionClassStateDto.targetState,
    );

    return this.commandBus.execute(command);
  }

  @Patch('/:classId/structure')
  @Role(['coach', 'owner'])
  @ApiOperation({
    summary: 'Update class structure',
    description:
      'Adjust class capacity and/or space during the publish/booking phase. Accessible by coaches and gym owners. Cannot reduce capacity below current booked athletes.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiBody({ type: UpdateClassStructureDto })
  @ApiResponse({
    status: 200,
    description: 'Class structure updated',
    type: UpdateClassStructureResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Coach or owner role required',
  })
  async updateClassStructure(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @Body(ValidationPipe) updateClassStructureDto: UpdateClassStructureDto,
    @CurrentUser() userId: string,
  ): Promise<UpdateClassStructureResponseDto> {
    if (updateClassStructureDto.classId !== classId) {
      throw new Error('Class ID mismatch');
    }

    const command = new UpdateClassStructureCommand(
      userId,
      classId,
      updateClassStructureDto.capacity,
      updateClassStructureDto.spaceId,
    );

    return this.commandBus.execute(command);
  }
}
