export class ConfigureClassTypesResponseDto {
  id: string;
  gymId: string;
  name: string;
  loggable: boolean;
  resultMetrics: 'time' | 'reps' | 'weight' | 'rounds' | 'none';
  deletedAt: Date | null;
}
