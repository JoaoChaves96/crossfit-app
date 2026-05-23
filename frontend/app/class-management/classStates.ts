import { components } from '@/types/api.gen';

type ClassDetail = components['schemas']['ClassScheduleItemDto'];
export type ClassState = ClassDetail['state'];

export const STATE_NEXT_MAP: Record<ClassState, ClassState | null> = {
  published: 'booking_closed',
  booking_closed: 'in_progress',
  in_progress: 'completed',
  completed: 'archived',
  archived: null,
};

export const STATE_LABEL: Record<ClassState, string> = {
  published: 'Published',
  booking_closed: 'Booking Closed',
  in_progress: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
};
