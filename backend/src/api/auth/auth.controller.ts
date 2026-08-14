import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from '../../domain/auth/auth.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';
import { SwitchGymContextDto } from './dto/switch-gym-context.dto';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register a new user account and receive a JWT token' })
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
}
