import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from '../../domain/auth/auth.service';
import { UserEntity } from '../../domain/user/entities/user.entity';
import { GymStaffEntity } from '../../domain/gym-staff/entities/gym-staff.entity';
import { GymMembershipEntity } from '../../domain/gym-membership/entities/gym-membership.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, GymStaffEntity, GymMembershipEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  // Exported so CreateGymHandler can re-issue a token when a user's gym
  // context changes mid-session (see AuthService.issueTokenForUser).
  exports: [AuthService],
})
export class AuthModule {}
