import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { GymEntity } from '../../domain/gym/entities/gym.entity';

/** Methods that only read. A frozen gym still answers all of these. */
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * GymStatusGuard enforces that a gym which is not `active` is frozen read-only.
 *
 * Suspension is a read-only freeze (`docs/DECISIONS.md` → *Gym Suspension Is A
 * Read-Only Freeze*): everyone keeps their reads, and nobody — the owner
 * included — may mutate. An owner locked out of their own records cannot see
 * what caused the suspension, and revoking staff access outright has no basis
 * in any Tier 1 document.
 *
 * It keys on the `:gymId` route param, which is precisely the gym-scoped
 * surface. A user-scoped mutation (`PATCH /api/me`, marking a notification
 * read) carries no `:gymId` and is deliberately untouched: one gym's suspension
 * must not freeze a person's own profile.
 *
 * Two routes it cannot see, both deliberate:
 *
 *  - `POST /api/invites/:inviteToken/accept` takes its gym from the invite
 *    token, so `AcceptInviteHandler` carries the check itself.
 *  - `POST /api/auth/gym-context` is not gated. Under a read-only freeze,
 *    entering a suspended gym to look at it is allowed — which also keeps this
 *    endpoint consistent with the gym list beside it, the property
 *    `docs/DECISIONS.md` cared about most.
 *
 * Must be applied after JwtAuthGuard. This is the net, not a replacement for a
 * handler's own preconditions — BookClassHandler, CreateSpaceHandler and
 * ManuallyAddMemberHandler each still check status themselves.
 */
@Injectable()
export class GymStatusGuard implements CanActivate {
  constructor(
    @InjectRepository(GymEntity)
    private readonly gymRepository: Repository<GymEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const routeGymId = (request.params as Record<string, string>).gymId;
    if (!routeGymId) {
      return true;
    }

    if (READ_METHODS.has(request.method)) {
      return true;
    }

    const gym = await this.gymRepository.findOne({
      where: { id: routeGymId },
      select: { id: true, status: true },
    });

    // Let the handler answer for a gym that does not exist. Answering 403 here
    // would both leak "no such gym" as "a gym you may not touch" and change the
    // status code this case already returns.
    if (!gym) {
      return true;
    }

    if (gym.status !== 'active') {
      throw new ForbiddenException('Gym is suspended');
    }

    return true;
  }
}
