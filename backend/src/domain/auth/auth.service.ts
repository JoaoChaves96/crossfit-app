import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from '../user/entities/user.entity';
import { GymStaffEntity } from '../gym-staff/entities/gym-staff.entity';
import { GymMembershipEntity } from '../gym-membership/entities/gym-membership.entity';
import { hashPassword, verifyPassword } from './password-hashing';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(GymStaffEntity)
    private readonly gymStaffRepository: Repository<GymStaffEntity>,
    @InjectRepository(GymMembershipEntity)
    private readonly gymMembershipRepository: Repository<GymMembershipEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<string> {
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Registration failed.');
    }

    const passwordHash = await hashPassword(password);
    const user = this.userRepository.create({
      id: uuidv4(),
      email,
      passwordHash,
      name,
      status: 'active',
    });
    await this.userRepository.save(user);

    const payload = {
      sub: user.id,
      email: user.email,
      gymId: null,
      role: null,
    };

    return this.jwtService.sign(payload);
  }

  async login(email: string, password: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { gymId, role } = await this.resolveGymContext(user.id);

    const payload = {
      sub: user.id,
      email: user.email,
      gymId,
      role,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Mint a fresh token for an existing user, re-resolving their gym context.
   *
   * Needed whenever a user's gym or role changes *after* they logged in: the
   * claims are baked into the token at sign time, so the stored token would
   * otherwise keep saying `gymId: null` and every gym-scoped request would be
   * rejected by GymOwnershipGuard. The first case is a new owner creating their
   * gym (CreateGymHandler).
   */
  async issueTokenForUser(userId: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { gymId, role } = await this.resolveGymContext(user.id);

    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      gymId,
      role,
    });
  }

  /**
   * Mint a token for one *named* gym the user is attached to.
   *
   * Distinct from issueTokenForUser, which re-resolves the default (oldest)
   * context. A coach may staff several gyms (DATA_MODEL.md) but the JWT carries
   * exactly one gymId and GymOwnershipGuard compares it to the route, so
   * without this every gym but the oldest is unreachable.
   */
  async issueTokenForGym(userId: string, gymId: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const context = await this.resolveGymContextFor(userId, gymId);

    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      gymId: context.gymId,
      role: context.role,
    });
  }

  /**
   * Resolve the caller's role at one specific gym.
   *
   * Staff beats membership when both exist, matching resolveGymContext — an
   * owner or coach who also trains at their own gym operates as staff.
   * Refuses rather than falling back: silently handing back a different gym's
   * context would be a tenant-isolation hole.
   */
  async resolveGymContextFor(
    userId: string,
    gymId: string,
  ): Promise<{ gymId: string; role: string }> {
    const staffEntry = await this.gymStaffRepository.findOne({
      where: { userId, gymId, status: 'active' },
    });
    if (staffEntry) {
      return { gymId, role: staffEntry.role };
    }

    const membership = await this.gymMembershipRepository.findOne({
      where: { userId, gymId, status: 'active' },
    });
    if (membership) {
      return { gymId, role: 'athlete' };
    }

    throw new ForbiddenException('User is not attached to this gym');
  }

  private async resolveGymContext(
    userId: string,
  ): Promise<{ gymId: string | null; role: string | null }> {
    // Ordered explicitly: a coach may staff several gyms (DATA_MODEL.md), so
    // without an ORDER BY the gym baked into the token is whatever the database
    // returned first and could differ between logins. Oldest assignment wins,
    // with id as a tiebreak so the result is stable.
    const staffEntry = await this.gymStaffRepository.findOne({
      where: { userId, status: 'active' },
      order: { assignedAt: 'ASC', id: 'ASC' },
    });

    if (staffEntry) {
      return { gymId: staffEntry.gymId, role: staffEntry.role };
    }

    const membership = await this.gymMembershipRepository.findOne({
      where: { userId, status: 'active' },
      order: { joinedAt: 'ASC', id: 'ASC' },
    });

    if (membership) {
      return { gymId: membership.gymId, role: 'athlete' };
    }

    return { gymId: null, role: null };
  }
}
