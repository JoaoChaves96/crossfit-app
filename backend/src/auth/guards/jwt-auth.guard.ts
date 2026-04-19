import { Injectable } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * JwtAuthGuard: Extracts x-user-id and x-gym-id headers for header-based auth
 *
 * For local dev with header-based authentication:
 * - Reads x-user-id header and populates request.user
 * - Reads x-gym-id header and populates request.gymId
 * - Allows all requests through (MVP)
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract user ID from x-user-id header
    const userId = request.headers['x-user-id'];
    if (userId) {
      (request as any).user = { id: userId };
    }

    // Extract gym ID from x-gym-id header
    const gymId = request.headers['x-gym-id'];
    if (gymId) {
      (request as any).gymId = gymId;
    }

    // Allow all requests (JWT validation not yet implemented)
    return true;
  }
}
