import {
  Controller,
  Post,
  Body,
  UseGuards,
  ValidationPipe,
  Inject,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CreateGymCommand } from '../../commands/gym/create-gym.command';
import { CreateGymDto } from '../../commands/gym/dto/create-gym.dto';
import { CreateGymResponseDto } from '../../commands/gym/dto/create-gym-response.dto';

@Controller('/api/gyms')
@ApiTags('Gym')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class GymController {
  constructor(@Inject(CommandBus) private readonly commandBus: CommandBus) {}

  /**
   * Create a gym (authenticated user becomes owner)
   *
   * **Preconditions:**
   * - User must be authenticated
   * - User must exist
   *
   * **Postconditions:**
   * - Gym created with status = pending_approval
   * - Authenticated user added to gym_staff as owner
   */
  @Post()
  @ApiOperation({
    summary: 'Create a gym',
    description:
      'Register a new gym. The authenticated user becomes the gym owner.',
  })
  @ApiBody({ type: CreateGymDto })
  @ApiResponse({ status: 201, description: 'Gym created successfully', type: CreateGymResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createGym(
    @Body(ValidationPipe) createGymDto: CreateGymDto,
    @CurrentUser() userId: string,
  ): Promise<CreateGymResponseDto> {
    const command = new CreateGymCommand(
      userId,
      createGymDto.name,
      createGymDto.location,
      createGymDto.description,
    );

    return this.commandBus.execute(command);
  }
}
