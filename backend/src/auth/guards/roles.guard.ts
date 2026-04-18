import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Inject,
} from '@nestjs/common';
import type { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { ROLE_KEY } from '../decorators/role.decorator';
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
    // Get required role from decorator metadata
    const requiredRole = this.reflector.get<string | undefined>(
      ROLE_KEY,
      context.getHandler(),
    );

    // If no role is specified, allow access (rely on JWT guard)
    if (!requiredRole) {
      return true;
    }

    // Extract request context
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { id: string } }>();
    const userId = request.user?.id;
    const gymId = (request.params as Record<string, string>).gymId;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!gymId) {
      throw new ForbiddenException('Gym context required');
    }

    // Validate role based on type
    if (requiredRole === 'owner') {
      return this.validateOwner(userId, gymId);
    } else if (requiredRole === 'coach') {
      const classId = (request.params as Record<string, string>).classId;
      if (!classId) {
        throw new ForbiddenException('Class context required for coach role');
      }
      return this.validateCoach(userId, classId, gymId);
    } else if (requiredRole === 'athlete') {
      return this.validateAthlete(userId, gymId);
    }

    throw new ForbiddenException(`Unknown role: ${requiredRole}`);
  }

  private async validateOwner(userId: string, gymId: string): Promise<boolean> {
    const isOwner = await this.gymStaffService.isGymOwner(userId, gymId);
    if (!isOwner) {
      throw new ForbiddenException('User is not a gym owner');
    }
    return true;
  }

  private async validateCoach(
    userId: string,
    classId: string,
    gymId: string,
  ): Promise<boolean> {
    const isCoach = await this.gymStaffService.isCoachAssignedToClass(
      userId,
      classId,
      gymId,
    );
    if (!isCoach) {
      throw new ForbiddenException('User is not an assigned coach');
    }
    return true;
  }

  private async validateAthlete(
    userId: string,
    gymId: string,
  ): Promise<boolean> {
    const hasMembership =
      await this.gymMembershipRepository.hasActiveMembershipInGym(
        userId,
        gymId,
      );
    if (!hasMembership) {
      throw new ForbiddenException(
        'User does not have active membership in gym',
      );
    }
    return true;
  }
}
