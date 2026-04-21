export class CreateGymResponseDto {
  id: string;
  name: string;
  location: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
}
