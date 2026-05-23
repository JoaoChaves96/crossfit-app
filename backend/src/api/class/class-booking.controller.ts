import {
  Controller,
  Get,
  Post,
  Delete,
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
import { CurrentRole } from '../../auth/decorators/current-role.decorator';
import { BookClassDto } from '../../commands/class/dto/book-class.dto';
import { BookClassCommand } from '../../commands/class/book-class.command';
import { BookClassResponseDto } from '../../commands/class/dto/book-class-response.dto';
import { CancelBookingCommand } from '../../commands/class/cancel-booking.command';
import { CancelBookingResponseDto } from '../../commands/class/dto/cancel-booking-response.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { GetClassBookingsService } from '../../queries/class/get-class-bookings.service';
import { GetClassBookingsResponseDto } from '../../queries/class/dto/get-class-bookings-response.dto';

@Controller('/api/gyms/:gymId/classes')
@ApiTags('Classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, GymOwnershipGuard, RolesGuard)
export class ClassBookingController {
  constructor(
    @Inject(CommandBus) private readonly commandBus: CommandBus,
    private readonly getClassBookingsService: GetClassBookingsService,
  ) {}

  @Get('/:classId/bookings')
  @Role(['coach', 'owner'])
  @ApiOperation({
    summary: 'Get booked athletes for a class',
    description:
      'Retrieve the list of athletes with active bookings (booked or waitlisted) for a class. Accessible by the assigned coach or the gym owner. gymId is validated against the class.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiResponse({
    status: 200,
    description: 'Bookings returned',
    type: GetClassBookingsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Coach or owner role required',
  })
  @ApiResponse({ status: 404, description: 'Class not found in gym' })
  async getClassBookings(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @CurrentUser() userId: string,
  ): Promise<GetClassBookingsResponseDto> {
    return this.getClassBookingsService.getClassBookings(
      gymId,
      classId,
      userId,
    );
  }

  @Post('/:classId/bookings')
  @Role(['athlete', 'owner', 'coach'])
  @ApiOperation({
    summary: 'Book a class',
    description:
      'Reserve a spot in a class or join the waitlist if full. Available to athletes, gym owners, and coaches. Membership and plan validation is bypassed for gym owners and coaches.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'classId', description: 'Class ID' })
  @ApiBody({ type: BookClassDto })
  @ApiResponse({
    status: 201,
    description: 'Class booked or waitlisted',
    type: BookClassResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Athlete, owner, or coach role required',
  })
  async bookClass(
    @Param('gymId') gymId: string,
    @Param('classId') classId: string,
    @Body(ValidationPipe) bookClassDto: BookClassDto,
    @CurrentUser() userId: string,
    @CurrentRole() userRole: string,
  ): Promise<BookClassResponseDto> {
    if (bookClassDto.gymId !== gymId) {
      throw new Error('Gym ID mismatch');
    }

    if (bookClassDto.classId !== classId) {
      throw new Error('Class ID mismatch');
    }

    const command = new BookClassCommand(userId, classId, gymId, userRole);

    return this.commandBus.execute(command);
  }

  @Delete('/bookings/:bookingId')
  @Role(['athlete', 'owner', 'coach'])
  @ApiOperation({
    summary: 'Cancel a booking',
    description:
      'Remove a user from a class booking. Only allowed while class is published. Available to athletes, gym owners, and coaches.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiParam({ name: 'bookingId', description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Booking cancelled',
    type: CancelBookingResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Athlete, owner, or coach role required',
  })
  async cancelBooking(
    @Param('gymId') gymId: string,
    @Param('bookingId') bookingId: string,
    @CurrentUser() userId: string,
  ): Promise<CancelBookingResponseDto> {
    const command = new CancelBookingCommand(userId, bookingId, gymId);

    return this.commandBus.execute(command);
  }
}
