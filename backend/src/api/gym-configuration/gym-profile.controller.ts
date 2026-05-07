import {
  Controller,
  Get,
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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { GetGymProfileService } from '../../queries/gym-configuration/get-gym-profile.service';
import { GymProfileDto } from '../../queries/gym-configuration/dto/gym-profile.dto';
import { UpdateGymProfileCommand } from '../../commands/gym-configuration/update-gym-profile.command';
import { UpdateGymProfileDto } from '../../commands/gym-configuration/dto/update-gym-profile.dto';

@Controller('/api/gyms/:gymId/profile')
@ApiTags('Gym Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, GymOwnershipGuard, RolesGuard)
export class GymProfileController {
  constructor(
    @Inject(CommandBus) private readonly commandBus: CommandBus,
    private readonly getGymProfileService: GetGymProfileService,
  ) {}

  @Get()
  @Role('owner')
  @ApiOperation({
    summary: 'Get gym profile',
    description:
      'Returns the gym profile including name, description, location, status, and creation date. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiResponse({
    status: 200,
    description: 'Gym profile returned',
    type: GymProfileDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  @ApiResponse({ status: 404, description: 'Gym not found' })
  async getProfile(
    @Param('gymId') gymId: string,
  ): Promise<GymProfileDto> {
    return this.getGymProfileService.getProfile(gymId);
  }

  @Patch()
  @Role('owner')
  @ApiOperation({
    summary: 'Update gym profile',
    description:
      'Updates editable gym profile fields (name, description, location). Returns the updated profile. Gym owners only.',
  })
  @ApiParam({ name: 'gymId', description: 'Gym ID' })
  @ApiBody({ type: UpdateGymProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Gym profile updated',
    type: GymProfileDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner role required' })
  @ApiResponse({ status: 404, description: 'Gym not found' })
  async updateProfile(
    @Param('gymId') gymId: string,
    @Body(ValidationPipe) updateGymProfileDto: UpdateGymProfileDto,
  ): Promise<GymProfileDto> {
    const command = new UpdateGymProfileCommand(
      gymId,
      updateGymProfileDto.name,
      updateGymProfileDto.description,
      updateGymProfileDto.location,
    );

    return this.commandBus.execute(command);
  }
}
