import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../auth/decorators/role.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { InviteService } from '../../domain/invite/invite.service';
import { InviteRole } from '../../domain/invite/entities/invite.entity';
import { CreateInviteDto } from './dto/create-invite.dto';
import { InviteResponseDto } from './dto/invite-response.dto';
import { InviteListItemDto } from './dto/invite-list-item.dto';
import { RevokeInviteResponseDto } from './dto/revoke-invite-response.dto';
import { ValidateInviteResponseDto } from './dto/validate-invite-response.dto';
import { AcceptInviteRequestDto } from './dto/accept-invite-request.dto';
import { AcceptInviteResponseDto } from './dto/accept-invite-response.dto';
import {
  AthleteAlreadyMemberError,
  CoachAlreadyStaffError,
  GymNotFoundError,
  InviteAlreadyAcceptedError,
  InviteAlreadyRevokedError,
  InviteeNotRegisteredError,
  InviteExpiredError,
  InviteNotFoundError,
  InviteRevokedError,
} from '../../domain/invite/invite.errors';

@ApiTags('Invites')
@Controller('/api')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  /**
   * Create an invite for an athlete to join a gym.
   * Gym owner or coach role required.
   */
  @Post('/gyms/:gymId/invites')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role(['owner', 'coach'])
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an athlete invite',
    description:
      'Generates a unique 7-day invite link for an athlete to join the gym. Accessible by gym owners and coaches.',
  })
  @ApiParam({
    name: 'gymId',
    description: 'The ID of the gym',
    example: 'uuid-gym-id',
  })
  @ApiBody({ type: CreateInviteDto })
  @ApiResponse({
    status: 201,
    description: 'Invite created and email sent',
    type: InviteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or gym not found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - owner or coach role required',
  })
  async createInvite(
    @Param('gymId') gymId: string,
    @Body(ValidationPipe) createInviteDto: CreateInviteDto,
    @CurrentUser() userId: string,
  ): Promise<InviteResponseDto> {
    try {
      return await this.inviteService.createInvite(
        gymId,
        userId,
        createInviteDto.inviteeEmail,
      );
    } catch (err) {
      if (err instanceof GymNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  /**
   * List all invites for a gym. Gym owner or coach role required.
   */
  @Get('/gyms/:gymId/invites')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role(['owner', 'coach'])
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all invites for a gym',
    description:
      'Returns all non-deleted invites for the given gym, ordered by creation date descending. Accessible by gym owners and coaches.',
  })
  @ApiParam({
    name: 'gymId',
    description: 'The ID of the gym',
    example: 'uuid-gym-id',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['athlete', 'coach'],
    description: 'Filter to invites of one role',
  })
  @ApiResponse({
    status: 200,
    description: 'List of invites',
    type: [InviteListItemDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - owner or coach role required',
  })
  async listInvites(
    @Param('gymId') gymId: string,
    @Query('role') role?: string,
  ): Promise<InviteListItemDto[]> {
    if (role !== undefined && role !== 'athlete' && role !== 'coach') {
      throw new BadRequestException('role must be "athlete" or "coach"');
    }
    return await this.inviteService.listInvites(gymId, role as InviteRole | undefined);
  }

  /**
   * Revoke an invite by token. Gym owner or coach role required.
   */
  @Delete('/gyms/:gymId/invites/:token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role(['owner', 'coach'])
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke an invite',
    description:
      'Sets the invite status to revoked. Returns 404 if not found, 400 if already accepted or already revoked.',
  })
  @ApiParam({
    name: 'gymId',
    description: 'The ID of the gym',
    example: 'uuid-gym-id',
  })
  @ApiParam({
    name: 'token',
    description: 'The unique invite token to revoke',
    example: 'abc123xyz...',
  })
  @ApiResponse({
    status: 200,
    description: 'Invite revoked',
    type: RevokeInviteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invite already accepted or already revoked',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - owner or coach role required',
  })
  @ApiResponse({ status: 404, description: 'Invite not found' })
  async revokeInvite(
    @Param('gymId') gymId: string,
    @Param('token') token: string,
  ): Promise<RevokeInviteResponseDto> {
    try {
      return await this.inviteService.revokeInvite(gymId, token);
    } catch (err) {
      if (err instanceof InviteNotFoundError) {
        throw new NotFoundException(err.message);
      }
      if (
        err instanceof InviteAlreadyAcceptedError ||
        err instanceof InviteAlreadyRevokedError
      ) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  /**
   * Validate an invite token (public — no auth required).
   * Returns invite details including gym info and current status.
   */
  @Get('/invites/:inviteToken')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate an invite token',
    description:
      'Public endpoint. Returns gym details and invite status for a given token. Expired tokens are marked accordingly.',
  })
  @ApiParam({
    name: 'inviteToken',
    description: 'The unique invite token from the invite link',
    example: 'abc123xyz',
  })
  @ApiResponse({
    status: 200,
    description: 'Invite details returned',
    type: ValidateInviteResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Invite not found' })
  async validateInvite(
    @Param('inviteToken') inviteToken: string,
  ): Promise<ValidateInviteResponseDto> {
    try {
      return await this.inviteService.validateInvite(inviteToken);
    } catch (err) {
      if (err instanceof InviteNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  /**
   * Accept an invite. No auth required — athlete may be logged in (JWT optional).
   * If JWT is present the authenticated user accepts; otherwise resolves by inviteeEmail.
   */
  @Post('/invites/:inviteToken/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept an invite',
    description:
      'Accepts an invite and, depending on the invite\'s role, creates a GymMembership (athlete) or a gym_staff row (coach). Returns a freshly signed JWT carrying the new gym context. If the request includes a valid JWT the authenticated user is used; otherwise the invitee is resolved by the invite email. The invitee must already be registered.',
  })
  @ApiParam({
    name: 'inviteToken',
    description: 'The unique invite token from the invite link',
    example: 'abc123xyz',
  })
  @ApiBody({ type: AcceptInviteRequestDto, required: false })
  @ApiResponse({
    status: 200,
    description:
      'Invite accepted; gym membership or staff row created, and a re-signed token returned',
    type: AcceptInviteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Token expired, revoked, already accepted, or invitee not registered',
  })
  @ApiResponse({ status: 404, description: 'Invite not found' })
  @ApiResponse({
    status: 409,
    description:
      'Invitee is already a member (athlete) or already staff (coach) at this gym',
  })
  async acceptInvite(
    @Param('inviteToken') inviteToken: string,
    @Body() _body: AcceptInviteRequestDto,
    @Req() request: Request & { user?: { id: string } },
  ): Promise<AcceptInviteResponseDto> {
    const userId: string | undefined = request.user?.id;
    try {
      return await this.inviteService.acceptInvite(inviteToken, userId);
    } catch (err) {
      if (err instanceof InviteNotFoundError) {
        throw new NotFoundException(err.message);
      }
      if (
        err instanceof InviteExpiredError ||
        err instanceof InviteRevokedError ||
        err instanceof InviteAlreadyAcceptedError ||
        err instanceof InviteeNotRegisteredError
      ) {
        throw new BadRequestException(err.message);
      }
      if (
        err instanceof AthleteAlreadyMemberError ||
        err instanceof CoachAlreadyStaffError
      ) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }
}
