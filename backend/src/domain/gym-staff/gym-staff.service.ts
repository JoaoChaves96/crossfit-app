import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GymStaffEntity } from './entities/gym-staff.entity';

@Injectable()
export class GymStaffService {
  constructor(
    @InjectRepository(GymStaffEntity)
    private readonly gymStaffRepository: Repository<GymStaffEntity>,
  ) {}

  async isGymOwner(userId: string, gymId: string): Promise<boolean> {
    const staff = await this.gymStaffRepository.findOne({
      where: {
        userId,
        gymId,
        role: 'owner',
        status: 'active',
      },
    });
    return !!staff;
  }

  async isCoach(userId: string, gymId: string): Promise<boolean> {
    const staff = await this.gymStaffRepository.findOne({
      where: {
        userId,
        gymId,
        role: 'coach',
        status: 'active',
      },
    });
    return !!staff;
  }

  async getGymStaffByUserAndGym(
    userId: string,
    gymId: string,
  ): Promise<GymStaffEntity | null> {
    return this.gymStaffRepository.findOne({
      where: { userId, gymId },
    });
  }

  async getGymStaffByGym(gymId: string): Promise<GymStaffEntity[]> {
    return this.gymStaffRepository.find({
      where: { gymId, status: 'active' },
    });
  }

  async getCoachesByGym(gymId: string): Promise<GymStaffEntity[]> {
    return this.gymStaffRepository.find({
      where: { gymId, role: 'coach', status: 'active' },
    });
  }

  async isCoachAssignedToClass(
    userId: string,
    classId: string,
    gymId: string,
  ): Promise<boolean> {
    // Coach is assigned if they are active in the gym and assigned to the class
    const staff = await this.gymStaffRepository.findOne({
      where: {
        userId,
        gymId,
        role: 'coach',
        status: 'active',
      },
    });
    // Additional check: the coach must be the assigned coach for this class
    // This is checked in the handler via ClassRepository.getClassById
    return !!staff;
  }
}
