import { Injectable, NotFoundException } from '@nestjs/common';
import { UserService } from '../../domain/user/user.service';
import { UserProfileDto } from './dto/user-profile.dto';

@Injectable()
export class GetUserProfileService {
  constructor(private readonly userService: UserService) {}

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.userService.getUserById(userId);

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}
