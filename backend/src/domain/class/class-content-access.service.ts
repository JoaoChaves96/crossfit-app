import { Injectable } from '@nestjs/common';
import { ClassEntity } from './entities/class.entity';
import { GymStaffService } from '../gym-staff/gym-staff.service';
import { forbidden } from '../../http/exceptions';

/**
 * ClassContentAccessService: authorization for editing the content of a class
 * (programming and loggable status).
 *
 * DECISIONS.md → "Programming Authorship":
 * - A gym owner may edit the content of ANY class in their own gym.
 * - A coach may edit the content only of a class they are assigned to, and only
 *   while they are active staff in that gym.
 *
 * Multi-tenant isolation is enforced by the caller (the class must be loaded
 * scoped by gymId); this service authorizes against the class's own gymId.
 */
@Injectable()
export class ClassContentAccessService {
  constructor(private readonly gymStaffService: GymStaffService) {}

  /**
   * Authorize the user as owner-of-the-gym or assigned-and-active coach.
   *
   * @throws ForbiddenException when the user is neither
   */
  async assertCanEditClassContent(
    userId: string,
    classEntity: ClassEntity,
  ): Promise<void> {
    const isOwner = await this.gymStaffService.isGymOwner(
      userId,
      classEntity.gymId,
    );
    if (isOwner) {
      return;
    }

    if (classEntity.coachUserId !== userId) {
      throw forbidden(
        'Only the gym owner or the coach assigned to this class can edit it',
      );
    }

    const isActiveCoach = await this.gymStaffService.isCoach(
      userId,
      classEntity.gymId,
    );
    if (!isActiveCoach) {
      throw forbidden('Coach is not active for this gym');
    }
  }
}
