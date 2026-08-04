import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * GymOwnershipGuard enforces that the :gymId route parameter matches
 * the gymId claim from the authenticated user's JWT token.
 *
 * Must be applied after JwtAuthGuard so that request.user is populated.
 * Throws 403 when the route gymId does not match the JWT gymId claim
 * (authenticated but wrong tenant).
 */
@Injectable()
export class GymOwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { gymId?: string } }>();

    const routeGymId = (request.params as Record<string, string>).gymId;

    if (!routeGymId) {
      return true;
    }

    const jwtGymId = request.user?.gymId;

    if (!jwtGymId || routeGymId !== jwtGymId) {
      throw new ForbiddenException('Gym ID mismatch');
    }

    return true;
  }
}
