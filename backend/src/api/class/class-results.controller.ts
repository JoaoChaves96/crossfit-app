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
import { GymStatusGuard } from '../../auth/guards/gym-status.guard';
import { Role } from '../../auth/decorators/role.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { GetClassResultsService } from '../../queries/class/get-class-results.service';
import { GetClassResultsResponseDto } from '../../queries/class/dto/get-class-results-response.dto';
import { GetMyClassResultService } from '../../queries/class/get-my-class-result.service';
import { GetMyClassResultResponseDto } from '../../queries/class/dto/get-my-class-result-response.dto';

@Controller('/api/gyms/:gymId/classes')
@ApiTags('Classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, GymOwnershipGuard, RolesGuard, GymStatusGuard)
export class ClassResultsController {
  constructor(
    @Inject(CommandBus) private readonly commandBus: CommandBus,
    private readonly getClassResultsService: GetClassResultsService,
    private readonly getMyClassResultService: GetMyClassResultService,
  ) {}

  @Post('/:classId/attendance')
  @Role(['coach', 'owner'])
  @ApiOperation({
    summary: 'Mark class attendance',
    description:
      'Record which athletes attended a class. Accessible by coaches and gym owners. Can mark attendance while class is in progress or completed.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiBody({ type: MarkAttendanceDto })
  @ApiResponse({
    status: 201,
    description: 'Attendance recorded',
    type: MarkAttendanceResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Coach or owner role required' })
  async markAttendance(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @Body(ValidationPipe) markAttendanceDto: MarkAttendanceDto,
    @CurrentUser() userId: string,
  ): Promise<MarkAttendanceResponseDto> {
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
      gymId,
      attendanceRecords,
    );

    return this.commandBus.execute(command);
  }

  @Get('/:classId/results/me')
  @Role(['athlete', 'owner', 'coach'])
  @ApiOperation({
    summary: "Get the caller's own result for a class",
    description:
      "Retrieve ONLY the authenticated user's own result for a given class. Accessible by athletes with active membership, coaches, and gym owners of the gym. Returns null result (HTTP 200) when the caller has not logged one yet. Never exposes other athletes' results. gymId is validated against the class.",
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({
    status: 200,
    description:
      "The caller's own result, or null when none has been logged yet",
    type: GetMyClassResultResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Athlete, coach, or owner in the gym required',
  })
  @ApiResponse({ status: 404, description: 'Class not found in gym' })
  async getMyClassResult(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @CurrentUser() userId: string,
  ): Promise<GetMyClassResultResponseDto> {
    return this.getMyClassResultService.getMyClassResult(
      gymId,
      classId,
      userId,
    );
  }

  @Get('/:classId/results')
  @Role(['coach', 'owner'])
  @ApiOperation({
    summary: 'Get athlete results for a class',
    description:
      'Retrieve all athlete results for a given class. Accessible by the assigned coach or the gym owner. gymId is validated against the class.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({
    status: 200,
    description: 'Results returned',
    type: GetClassResultsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Coach or owner role required',
  })
  @ApiResponse({ status: 404, description: 'Class not found in gym' })
  async getClassResults(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @CurrentUser() userId: string,
  ): Promise<GetClassResultsResponseDto> {
    return this.getClassResultsService.getClassResults(gymId, classId, userId);
  }

  @Post('/:classId/results')
  @Role(['athlete', 'owner', 'coach'])
  @ApiOperation({
    summary: 'Log a result for a completed class',
    description:
      'Submit performance data for a completed class. Available to athletes, gym owners, and coaches. Can only log results for classes where the user was marked present.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiBody({ type: LogResultDto })
  @ApiResponse({
    status: 201,
    description: 'Result logged',
    type: LogResultResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Athlete, owner, or coach role required',
  })
  async logResult(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @Body(ValidationPipe) logResultDto: LogResultDto,
    @CurrentUser() userId: string,
  ): Promise<LogResultResponseDto> {
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

  @Patch('/results/:resultId')
  @Role(['athlete', 'owner', 'coach'])
  @ApiOperation({
    summary: 'Edit a logged result',
    description:
      'Update performance data for a result. Available to athletes, gym owners, and coaches. Can edit until class is archived.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'resultId', description: 'Result ID' })
  @ApiBody({ type: EditResultDto })
  @ApiResponse({
    status: 200,
    description: 'Result updated',
    type: EditResultResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Athlete, owner, or coach role required',
  })
  async editResult(
    @Param('gymId') gymId: string,
    @Param('resultId') resultId: string,
    @Body(ValidationPipe) editResultDto: EditResultDto,
    @CurrentUser() userId: string,
  ): Promise<EditResultResponseDto> {
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
