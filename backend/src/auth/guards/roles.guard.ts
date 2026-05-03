import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Inject,
} from '@nestjs/common';
import type { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { ROLE_KEY, AllowedRole } from '../decorators/role.decorator';
import { USER_SCOPED_KEY } from '../decorators/user-scoped.decorator';
import { GymStaffService } from '../../domain/gym-staff/gym-staff.service';
import { GymMembershipRepository } from '../../repositories/gym-membership.repository';

/**
 * RolesGuard: Context-aware role-based authorization at HTTP boundary
 *
 * Supports three roles:
 * - 'owner': User is a gym owner
 * - 'coach': User is an assigned coach at the gym
 * - 'athlete': User has active membership in the gym
 *
 * Accepts a single role or an array of roles. When multiple roles are given
 * the user must satisfy at least one of them (OR semantics).
 *
 * This guard complements handler-level authorization (does not replace it).
 * Fails fast at the HTTP boundary for defense-in-depth.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(GymStaffService) private gymStaffService: GymStaffService,
    @Inject(GymMembershipRepository)
    private gymMembershipRepository: GymMembershipRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required roles from decorator metadata (always an array after decorator change)
    const requiredRoles = this.reflector.get<AllowedRole[] | undefined>(
      ROLE_KEY,
      context.getHandler(),
    );

    // If no role is specified, allow access (rely on JWT guard)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Check if endpoint is user-scoped (does not require gym context)
    const isUserScoped = this.reflector.get<boolean | undefined>(
      USER_SCOPED_KEY,
      context.getHandler(),
    );

    // Extract request context
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { id: string } }>();
    const userId = request.user?.id;
    const gymId = (request.params as Record<string, string>).gymId;
    const classId = (request.params as Record<string, string>).classId;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // For user-scoped endpoints with athlete role, only authentication is required
    if (isUserScoped && requiredRoles.includes('athlete')) {
      return true;
    }

    // For gym-scoped endpoints, require gymId in route params
    if (!gymId) {
      throw new ForbiddenException('Gym context required');
    }

    // Try each allowed role in order; grant access if any succeeds
    for (const role of requiredRoles) {
      if (role === 'owner') {
        const isOwner = await this.gymStaffService.isGymOwner(userId, gymId);
        if (isOwner) return true;
      } else if (role === 'coach') {
        if (classId) {
          // Class-scoped check: user must be assigned to this specific class
          const isCoach = await this.gymStaffService.isCoachAssignedToClass(
            userId,
            classId,
            gymId,
          );
          if (isCoach) return true;
        } else {
          // Gym-scoped check: user must be an active coach in this gym
          const isCoach = await this.gymStaffService.isCoach(userId, gymId);
          if (isCoach) return true;
        }
      } else if (role === 'athlete') {
        const hasMembership =
          await this.gymMembershipRepository.hasActiveMembershipInGym(
            userId,
            gymId,
          );
        if (hasMembership) return true;
      }
    }

    throw new ForbiddenException(
      `Access denied. Required role(s): ${requiredRoles.join(', ')}`,
    );
  }
}
