export class EditResultResponseDto {
  id: string;
  classId: string;
  userId: string;
  metricType: 'time' | 'reps' | 'weight' | 'rounds' | 'note';
  value: string;
  unit: 'seconds' | 'minutes' | 'reps' | 'kg' | 'lb' | 'rounds' | 'none';
  notes: string | null;
  loggedAt: Date;
  editedAt: Date | null;
}
