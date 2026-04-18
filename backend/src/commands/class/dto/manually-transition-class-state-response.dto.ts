export class ManuallyTransitionClassStateResponseDto {
  id: string;
  gymId: string;
  classTypeId: string;
  coachUserId: string;
  spaceId: string;
  scheduledDate: Date;
  scheduledTime: string;
  capacity: number;
  loggable: boolean;
  state: string;
  createdAt: Date;
  lastModifiedAt: Date;
}
