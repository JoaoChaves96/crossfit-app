export class BookClassResponseDto {
  id: string;
  classId: string;
  userId: string;
  status: 'booked' | 'waitlisted' | 'cancelled';
  bookedPosition: number | null;
  createdAt: Date;
  cancelledAt: Date | null;
}
