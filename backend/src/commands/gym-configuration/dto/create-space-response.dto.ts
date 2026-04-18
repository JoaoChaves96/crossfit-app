export class CreateSpaceResponseDto {
  id: string;
  gymId: string;
  name: string;
  baseCapacity: number;
  deletedAt: Date | null;
}
