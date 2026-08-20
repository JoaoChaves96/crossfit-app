import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { HealthResponseDto } from './dto/health-response.dto';

/**
 * Liveness for the platform's health check, and readiness for the e2e suite.
 *
 * Deliberately unauthenticated: this codebase registers no APP_GUARD, so a
 * controller without @UseGuards is public. A health check behind auth cannot be
 * used by a load balancer, and this route reveals nothing — the database branch
 * reports up/down and never the driver's message, which can carry credentials.
 *
 * It pings rather than merely returning 200. A process that is listening but
 * cannot reach Postgres serves nothing useful, and the deploy pipeline must
 * treat that as a failed release, not a healthy one.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness and database reachability',
    description:
      'Returns 200 when the process is listening and a SELECT 1 succeeds. ' +
      'Returns 503 when the database is unreachable. Unauthenticated.',
  })
  @ApiResponse({
    status: 200,
    description: 'The process and its database are both healthy.',
    type: HealthResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'The process is listening but the database is unreachable.',
  })
  async check(): Promise<HealthResponseDto> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }

    return { status: 'ok', database: 'up' };
  }
}
