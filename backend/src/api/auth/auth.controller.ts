import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from '../../domain/auth/auth.service';
import { PasswordResetService } from '../../domain/auth/password-reset.service';
import { PasswordChangeService } from '../../domain/auth/password-change.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SwitchGymContextDto } from './dto/switch-gym-context.dto';
import { ValidateResetTokenResponseDto } from './dto/validate-reset-token-response.dto';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly passwordChangeService: PasswordChangeService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register a new user account and receive a JWT token',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 200,
    description: 'Registration successful. Returns a signed JWT access token.',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error (missing or malformed fields).',
  })
  @ApiResponse({
    status: 409,
    description: 'Registration failed.',
  })
  async register(@Body() body: RegisterDto): Promise<LoginResponseDto> {
    const accessToken = await this.authService.register(
      body.email,
      body.password,
      body.name,
    );
    return { accessToken };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate a user and receive a JWT token' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns a signed JWT access token.',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error (missing or malformed fields).',
  })
  async login(@Body() body: LoginDto): Promise<LoginResponseDto> {
    const accessToken = await this.authService.login(body.email, body.password);
    return { accessToken };
  }

  @Post('gym-context')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Switch the active gym context',
    description:
      'Returns a token re-signed for the named gym. The caller must have an active staff row or an active membership there. Not a general refresh endpoint: it only re-signs for a gym the caller is provably attached to.',
  })
  @ApiBody({ type: SwitchGymContextDto })
  @ApiResponse({
    status: 200,
    description: 'Token re-signed for the named gym.',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not attached to this gym.',
  })
  async switchGymContext(
    @CurrentUser() userId: string,
    @Body(ValidationPipe) dto: SwitchGymContextDto,
  ): Promise<LoginResponseDto> {
    const accessToken = await this.authService.issueTokenForGym(
      userId,
      dto.gymId,
    );
    return { accessToken };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a password reset link',
    description:
      'Always returns 200 with an empty body — for a known address, an unknown address, a throttled request and a failed send alike. Any variation would be an account-enumeration oracle, and a delivery status would tell an anonymous caller nothing they could act on.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Request accepted. Reveals nothing about the address.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error (malformed email).',
  })
  async forgotPassword(@Body() body: ForgotPasswordDto): Promise<void> {
    await this.passwordResetService.requestReset(body.email);
  }

  @Get('reset-password/:token/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check whether a reset link is still usable',
    description:
      'Lets the reset screen show an expired state on mount instead of after the user has typed a new password twice.',
  })
  @ApiParam({ name: 'token', description: 'The token from the reset link' })
  @ApiResponse({
    status: 200,
    description: 'Validity of the token.',
    type: ValidateResetTokenResponseDto,
  })
  async validateResetToken(
    @Param('token') token: string,
  ): Promise<ValidateResetTokenResponseDto> {
    return { valid: await this.passwordResetService.isTokenValid(token) };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set a new password using a reset link',
    description:
      'On success the user is signed in: the response carries a JWT, as register and login do. Sessions issued before the reset are NOT revoked — an accepted limit recorded in epics/PASSWORD_RESET_EPIC.md.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed. Returns a signed JWT access token.',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'The reset link is unknown, expired or already used — the three are deliberately indistinguishable. Also returned for validation errors.',
  })
  async resetPassword(
    @Body() body: ResetPasswordDto,
  ): Promise<LoginResponseDto> {
    const accessToken = await this.passwordResetService.resetPassword(
      body.token,
      body.password,
    );
    return { accessToken };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change the signed-in user’s own password',
    description:
      'Scoped to the caller in the token; the body names no account. Returns an empty body — the existing session stays valid and no token is re-issued, because nothing is revoked. A wrong current password is a 400, not a 401: the authentication on this request is valid, and 401 here is reserved for a missing or invalid token. The account holder is emailed that the change happened, which is the only signal available if it was not them.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed.',
  })
  @ApiResponse({
    status: 400,
    description:
      'The current password is wrong, or the new password matches the current one. Also returned for validation errors.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  async changePassword(
    @CurrentUser() userId: string,
    @Body(ValidationPipe) dto: ChangePasswordDto,
  ): Promise<void> {
    await this.passwordChangeService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
