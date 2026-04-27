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
import { Role } from '../../auth/decorators/role.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CurrentGym } from '../../auth/decorators/current-gym.decorator';
import { CreateClassDto } from '../../commands/class/dto/create-class.dto';
import { CreateClassCommand } from '../../commands/class/create-class.command';
import { CreateClassResponseDto } from '../../commands/class/dto/create-class-response.dto';
import { BookClassDto } from '../../commands/class/dto/book-class.dto';
import { BookClassCommand } from '../../commands/class/book-class.command';
import { BookClassResponseDto } from '../../commands/class/dto/book-class-response.dto';
import { CancelBookingCommand } from '../../commands/class/cancel-booking.command';
import { CancelBookingResponseDto } from '../../commands/class/dto/cancel-booking-response.dto';
import { MarkAttendanceDto } from '../../commands/class/dto/mark-attendance.dto';
import {
  MarkAttendanceCommand,
  AttendanceRecord,
} from '../../commands/class/mark-attendance.command';
import { MarkAttendanceResponseDto } from '../../commands/class/dto/mark-attendance-response.dto';
import { LogResultDto } from '../../commands/class/dto/log-result.dto';
import { LogResultCommand } from '../../commands/class/log-result.command';
import { LogResultResponseDto } from '../../commands/class/dto/log-result-response.dto';
import { EditResultDto } from '../../commands/class/dto/edit-result.dto';
import { EditResultCommand } from '../../commands/class/edit-result.command';
import { EditResultResponseDto } from '../../commands/class/dto/edit-result-response.dto';
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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { ClassScheduleService } from '../../queries/class/class-schedule.service';
import { GetClassScheduleResponseDto } from '../../queries/class/dto/get-class-schedule-response.dto';

@Controller('/api/gyms/:gymId/classes')
@ApiTags('Classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassController {
  constructor(
    @Inject(CommandBus) private readonly commandBus: CommandBus,
    private readonly classScheduleService: ClassScheduleService,
  ) {}

  /**
   * Get eligible classes for an athlete (Athlete)
   *
   * **Visibility Rules (enforced):**
   * - Athlete must have active gym membership in this gym
   * - Athlete must have active membership plan
   * - Athlete's plan must include the class type
   * - Only non-archived classes are shown
   *
   * **Response:**
   * - List of eligible classes sorted by date/time
   * - Includes class type, coach, capacity, and booking count
   */
  @Get()
  @Role('athlete')
  @ApiOperation({
    summary: 'Get class schedule for athlete',
    description:
      'Retrieve all classes eligible for the authenticated athlete in a gym. Classes are filtered by gym membership and membership plan visibility. Athletes only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiResponse({ status: 200, description: 'Class schedule returned', type: GetClassScheduleResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Athlete role required' })
  async getClassSchedule(
    @Param('gymId') gymId: string,
    @CurrentUser() userId: string,
  ): Promise<GetClassScheduleResponseDto> {
    return this.classScheduleService.getClassScheduleForAthlete(gymId, userId);
  }

  /**
   * Create a new class (Gym Owner only)
   *
   * **Preconditions:**
   * - User must be authenticated as a gym owner
   * - Gym must exist and be active
   * - ClassType must exist and belong to the gym
   * - Coach must be an active GymStaff member with role = coach
   * - Space must exist and belong to the gym
   * - scheduled_date + scheduled_time must be in the future
   *
   * **Postconditions:**
   * - Class is created with state = 'published'
   * - Class becomes immediately visible to eligible athletes
   */
  @Post()
  @Role('owner')
  @ApiOperation({
    summary: 'Create a new class',
    description:
      'Schedule a new training session. Only gym owners can create classes.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiBody({ type: CreateClassDto })
  @ApiResponse({ status: 201, description: 'Class created', type: CreateClassResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  async createClass(
    @Param('gymId') gymId: string,
    @Body(ValidationPipe) createClassDto: CreateClassDto,
    @CurrentUser() userId: string,
    @CurrentGym() currentGymId: string,
  ): Promise<CreateClassResponseDto> {
    // Verify the param gymId matches the current gym context
    if (gymId !== currentGymId) {
      throw new Error('Gym ID mismatch');
    }

    const command = new CreateClassCommand(
      userId,
      gymId,
      createClassDto.classTypeId,
      createClassDto.coachUserId,
      createClassDto.spaceId,
      new Date(createClassDto.scheduledDate),
      createClassDto.scheduledTime,
      createClassDto.capacity,
    );

    return this.commandBus.execute(command);
  }

  /**
   * Book a class (Athlete)
   *
   * **Preconditions:**
   * - User must be authenticated as an athlete
   * - Athlete must have active GymMembership for the class's gym
   * - Athlete must have active AthleteMembershipPlan for that gym
   * - Athlete's plan must include the class's class_type_id
   * - Class must exist and state = 'published'
   * - Class.gym_id must match the provided gym_id
   * - Athlete must not already have an active booking for this class
   * - Gym must be active
   *
   * **Postconditions:**
   * - Booking created with status = 'booked' if capacity available
   * - Booking created with status = 'waitlisted' if at capacity
   */
  @Post('/:classId/bookings')
  @Role('athlete')
  @ApiOperation({
    summary: 'Book a class',
    description:
      'Reserve a spot in a class or join the waitlist if full. Athletes only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiBody({ type: BookClassDto })
  @ApiResponse({ status: 201, description: 'Class booked or waitlisted', type: BookClassResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Athlete role required' })
  async bookClass(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @Body(ValidationPipe) bookClassDto: BookClassDto,
    @CurrentUser() userId: string,
    @CurrentGym() currentGymId: string,
  ): Promise<BookClassResponseDto> {
    // Verify the param gymId matches the current gym context
    if (gymId !== currentGymId) {
      throw new Error('Gym ID mismatch');
    }

    // Verify the gymId in DTO matches the param
    if (bookClassDto.gymId !== gymId) {
      throw new Error('Gym ID mismatch');
    }

    // Verify the classId in DTO matches the param
    if (bookClassDto.classId !== classId) {
      throw new Error('Class ID mismatch');
    }

    const command = new BookClassCommand(userId, classId, gymId);

    return this.commandBus.execute(command);
  }

  /**
   * Cancel a booking (Athlete)
   *
   * **Preconditions:**
   * - User must be authenticated as an athlete
   * - Booking must exist and belong to the athlete
   * - Booking status must be 'booked' or 'waitlisted'
   * - Class must be in 'published' state
   * - Booking must not already be cancelled
   *
   * **Postconditions:**
   * - Booking status set to 'cancelled'
   * - If booking was booked and waitlist exists, first waitlisted athlete is promoted
   * - Remaining waitlist positions are renumbered
   */
  @Delete('/bookings/:bookingId')
  @Role('athlete')
  @ApiOperation({
    summary: 'Cancel a booking',
    description:
      'Remove an athlete from a class booking. Only allowed while class is published. Athletes only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'bookingId', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking cancelled', type: CancelBookingResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Athlete role required' })
  async cancelBooking(
    @Param('gymId') gymId: string,
    @Param('bookingId') bookingId: string,
    @CurrentUser() userId: string,
    @CurrentGym() currentGymId: string,
  ): Promise<CancelBookingResponseDto> {
    // Verify the param gymId matches the current gym context
    if (gymId !== currentGymId) {
      throw new Error('Gym ID mismatch');
    }

    const command = new CancelBookingCommand(userId, bookingId, gymId);

    return this.commandBus.execute(command);
  }

  /**
   * Mark attendance (Coach)
   *
   * **Preconditions:**
   * - User must be authenticated as a coach
   * - Coach must be assigned to the class
   * - Class must be in 'in_progress' or 'completed' state
   * - Class must not be archived
   *
   * **Postconditions:**
   * - Attendance records created or updated for all provided athletes
   * - If athlete marked absent (was present), waitlist is promoted
   * - Athlete becomes eligible for result logging if marked present
   */
  @Post('/:classId/attendance')
  @Role('coach')
  @ApiOperation({
    summary: 'Mark class attendance',
    description:
      'Record which athletes attended a class. Coaches only. Can mark attendance while class is in progress or completed.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiBody({ type: MarkAttendanceDto })
  @ApiResponse({ status: 201, description: 'Attendance recorded', type: MarkAttendanceResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Coach role required' })
  async markAttendance(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @Body(ValidationPipe) markAttendanceDto: MarkAttendanceDto,
    @CurrentUser() userId: string,
    @CurrentGym() currentGymId: string,
  ): Promise<MarkAttendanceResponseDto> {
    // Verify the param gymId matches the current gym context
    if (gymId !== currentGymId) {
      throw new Error('Gym ID mismatch');
    }

    // Verify the classId in DTO matches the param
    if (markAttendanceDto.classId !== classId) {
      throw new Error('Class ID mismatch');
    }

    const attendanceRecords: AttendanceRecord[] =
      markAttendanceDto.attendanceRecords.map((record) => ({
        athleteUserId: record.athleteUserId,
        present: record.present,
        notes: record.notes,
      }));

    const command = new MarkAttendanceCommand(
      userId,
      classId,
      attendanceRecords,
    );

    return this.commandBus.execute(command);
  }

  /**
   * Add or edit programming (Coach)
   *
   * **Preconditions:**
   * - User must be authenticated as a coach
   * - Coach must be assigned to the class
   * - Class must be in 'published' or 'booking_closed' state
   *
   * **Postconditions:**
   * - Programming created or updated with provided content
   * - If loggable is provided, class.loggable is updated
   * - Coach can modify until class transitions to in_progress
   */
  @Post('/:classId/programming')
  @Role('coach')
  @ApiOperation({
    summary: 'Add or edit class programming',
    description:
      'Create or update workout content and loggable status for a class. Coaches only. Programming can be edited while class is published or booking closed.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiBody({ type: AddOrEditProgrammingDto })
  @ApiResponse({ status: 201, description: 'Programming saved', type: AddOrEditProgrammingResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Coach role required' })
  async addOrEditProgramming(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @Body(ValidationPipe) addOrEditProgrammingDto: AddOrEditProgrammingDto,
    @CurrentUser() userId: string,
    @CurrentGym() currentGymId: string,
  ): Promise<AddOrEditProgrammingResponseDto> {
    // Verify the param gymId matches the current gym context
    if (gymId !== currentGymId) {
      throw new Error('Gym ID mismatch');
    }

    // Verify the classId in DTO matches the param
    if (addOrEditProgrammingDto.classId !== classId) {
      throw new Error('Class ID mismatch');
    }

    const command = new AddOrEditProgrammingCommand(
      userId,
      classId,
      addOrEditProgrammingDto.content,
      addOrEditProgrammingDto.loggable,
    );

    return this.commandBus.execute(command);
  }

  /**
   * Toggle class loggable status (Coach)
   *
   * **Preconditions:**
   * - User must be authenticated as a coach
   * - Coach must be assigned to the class
   *
   * **Postconditions:**
   * - Class.loggable is toggled (true -> false, false -> true)
   * - Athletes can only log results if class is loggable when completed
   */
  @Post('/:classId/toggle-loggable')
  @Role('coach')
  @ApiOperation({
    summary: 'Toggle class loggable status',
    description:
      'Toggle whether athletes can log results for this class. Coaches only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiBody({ type: ToggleLoggableStatusDto })
  @ApiResponse({ status: 201, description: 'Loggable status toggled', type: ToggleLoggableStatusResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Coach role required' })
  async toggleLoggableStatus(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @Body(ValidationPipe) toggleLoggableStatusDto: ToggleLoggableStatusDto,
    @CurrentUser() userId: string,
    @CurrentGym() currentGymId: string,
  ): Promise<ToggleLoggableStatusResponseDto> {
    // Verify the param gymId matches the current gym context
    if (gymId !== currentGymId) {
      throw new Error('Gym ID mismatch');
    }

    // Verify the classId in DTO matches the param
    if (toggleLoggableStatusDto.classId !== classId) {
      throw new Error('Class ID mismatch');
    }

    const command = new ToggleLoggableStatusCommand(userId, classId);

    return this.commandBus.execute(command);
  }

  /**
   * Manually transition class state (Coach)
   *
   * **Preconditions:**
   * - User must be authenticated as a coach
   * - Coach must be assigned to the class
   * - Target state must be the next state in the progression (published → booking_closed → in_progress → completed → archived)
   *
   * **Postconditions:**
   * - Class transitions to the target state
   * - Class cannot transition backwards (state machine is unidirectional)
   */
  @Post('/:classId/transition')
  @Role('coach')
  @ApiOperation({
    summary: 'Manually transition class state',
    description:
      'Move a class to the next state in the lifecycle (published → booking_closed → in_progress → completed → archived). Coaches only. State transitions are unidirectional.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiBody({ type: ManuallyTransitionClassStateDto })
  @ApiResponse({ status: 201, description: 'Class state transitioned', type: ManuallyTransitionClassStateResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Coach role required' })
  async manuallyTransitionClassState(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @Body(ValidationPipe)
    manuallyTransitionClassStateDto: ManuallyTransitionClassStateDto,
    @CurrentUser() userId: string,
    @CurrentGym() currentGymId: string,
  ): Promise<ManuallyTransitionClassStateResponseDto> {
    // Verify the param gymId matches the current gym context
    if (gymId !== currentGymId) {
      throw new Error('Gym ID mismatch');
    }

    // Verify the classId in DTO matches the param
    if (manuallyTransitionClassStateDto.classId !== classId) {
      throw new Error('Class ID mismatch');
    }

    const command = new ManuallyTransitionClassStateCommand(
      userId,
      classId,
      manuallyTransitionClassStateDto.targetState,
    );

    return this.commandBus.execute(command);
  }

  /**
   * Update class structure (Coach)
   *
   * **Preconditions:**
   * - User must be authenticated as a coach
   * - Coach must be assigned to the class
   * - Class must be in 'published' or 'booking_closed' state
   * - If reducing capacity, new capacity must be >= booked bookings
   * - If changing space, new space must belong to the same gym
   *
   * **Postconditions:**
   * - Class capacity and/or space updated
   * - Structural changes are allowed until in_progress
   */
  @Patch('/:classId/structure')
  @Role('coach')
  @ApiOperation({
    summary: 'Update class structure',
    description:
      'Adjust class capacity and/or space during the publish/booking phase. Coaches only. Cannot reduce capacity below current booked athletes.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiBody({ type: UpdateClassStructureDto })
  @ApiResponse({ status: 200, description: 'Class structure updated', type: UpdateClassStructureResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Coach role required' })
  async updateClassStructure(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @Body(ValidationPipe) updateClassStructureDto: UpdateClassStructureDto,
    @CurrentUser() userId: string,
    @CurrentGym() currentGymId: string,
  ): Promise<UpdateClassStructureResponseDto> {
    // Verify the param gymId matches the current gym context
    if (gymId !== currentGymId) {
      throw new Error('Gym ID mismatch');
    }

    // Verify the classId in DTO matches the param
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

  /**
   * Log a result (Athlete)
   *
   * **Preconditions:**
   * - User must be authenticated as an athlete
   * - Class must be in 'completed' state
   * - Athlete must have been marked present for the class
   * - Class type must have loggable = true
   * - Result must not already exist for this athlete/class pair
   * - Metric type and unit must align with class type result metrics
   *
   * **Postconditions:**
   * - Result created with logged_at = now, edited_at = null
   * - Athlete can later edit the result until class is archived
   */
  @Post('/:classId/results')
  @Role('athlete')
  @ApiOperation({
    summary: 'Log a result for a completed class',
    description:
      'Submit performance data for a completed class. Athletes only. Can only log results for classes where athlete was marked present.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiBody({ type: LogResultDto })
  @ApiResponse({ status: 201, description: 'Result logged', type: LogResultResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Athlete role required' })
  async logResult(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @Body(ValidationPipe) logResultDto: LogResultDto,
    @CurrentUser() userId: string,
    @CurrentGym() currentGymId: string,
  ): Promise<LogResultResponseDto> {
    // Verify the param gymId matches the current gym context
    if (gymId !== currentGymId) {
      throw new Error('Gym ID mismatch');
    }

    // Verify the classId in DTO matches the param
    if (logResultDto.classId !== classId) {
      throw new Error('Class ID mismatch');
    }

    const command = new LogResultCommand(
      userId,
      classId,
      logResultDto.metricType,
      logResultDto.value,
      logResultDto.unit,
      logResultDto.notes,
    );

    return this.commandBus.execute(command);
  }

  /**
   * Edit a result (Athlete)
   *
   * **Preconditions:**
   * - User must be authenticated as an athlete
   * - Result must exist and belong to the athlete
   * - Class must be in 'completed' state (not archived)
   * - Athlete must have been marked present for the class
   * - Metric type and unit must align with class type result metrics (if provided)
   *
   * **Postconditions:**
   * - Result updated with provided fields only
   * - edited_at set to now
   * - Can edit until class is archived
   */
  @Patch('/results/:resultId')
  @Role('athlete')
  @ApiOperation({
    summary: 'Edit a logged result',
    description:
      'Update performance data for a result. Athletes only. Can edit until class is archived.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'resultId', description: 'Result ID' })
  @ApiBody({ type: EditResultDto })
  @ApiResponse({ status: 200, description: 'Result updated', type: EditResultResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Athlete role required' })
  async editResult(
    @Param('gymId') gymId: string,
    @Param('resultId') resultId: string,
    @Body(ValidationPipe) editResultDto: EditResultDto,
    @CurrentUser() userId: string,
    @CurrentGym() currentGymId: string,
  ): Promise<EditResultResponseDto> {
    // Verify the param gymId matches the current gym context
    if (gymId !== currentGymId) {
      throw new Error('Gym ID mismatch');
    }

    // Verify the resultId in DTO matches the param
    if (editResultDto.resultId !== resultId) {
      throw new Error('Result ID mismatch');
    }

    const command = new EditResultCommand(
      userId,
      resultId,
      editResultDto.metricType,
      editResultDto.value,
      editResultDto.unit,
      editResultDto.notes,
    );

    return this.commandBus.execute(command);
  }
}
