export class CreateClassResponseDto {
  id: string;
  gymId: string;
  classTypeId: string;
  coachUserId: string;
  spaceId: string;
  scheduledDate: Date;
  scheduledTime: string;
  capacity: number;
  state: string;
  createdAt: Date;
  lastModifiedAt: Date;
}
