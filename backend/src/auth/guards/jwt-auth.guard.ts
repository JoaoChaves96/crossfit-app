import { Injectable } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';

/**
 * JwtAuthGuard: Placeholder for JWT authentication
 *
 * In MVP, this is minimal - just allows requests through.
 * In production, implement proper JWT validation here.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canActivate(_context: ExecutionContext): boolean {
    // TODO: Implement JWT validation
    // For MVP, allow all requests
    return true;
  }
}
