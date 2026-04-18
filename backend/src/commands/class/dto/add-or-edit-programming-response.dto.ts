export class AddOrEditProgrammingResponseDto {
  id: string;
  classId: string;
  content: string;
  createdByUserId: string;
  createdAt: Date;
  lastModifiedAt: Date;
  lastModifiedByUserId: string | null;
}
