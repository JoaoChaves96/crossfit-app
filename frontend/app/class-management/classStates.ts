import { components } from '@/types/api.gen';
import { type ChipTone } from '@/components/cleanink';

type ClassDetail = components['schemas']['ClassScheduleItemDto'];
export type ClassState = ClassDetail['state'];

/**
 * Programming is editable only while the class is published or booking_closed.
 *
 * Mirrors add-or-edit-programming.handler, which rejects every later state
 * outright. Past that point the UI must not offer a Save at all — a disabled
 * button would imply a temporary lock, and the backend refuses permanently.
 */
const PROGRAMMING_EDITABLE_STATES: ClassState[] = ['published', 'booking_closed'];

export function isProgrammingEditable(state: ClassState): boolean {
  return PROGRAMMING_EDITABLE_STATES.includes(state);
}

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

/**
 * Lifecycle chip tone — the single source of truth, paired with STATE_LABEL.
 *
 * Published reads as an available/active "open" state; every sunken lifecycle
 * state (Booking Closed / In Progress / Completed / Archived) is a quiet
 * neutral. The accent is never used for lifecycle.
 */
export const STATE_CHIP_TONE: Record<ClassState, ChipTone> = {
  published: 'open',
  booking_closed: 'neutral',
  in_progress: 'neutral',
  completed: 'neutral',
  archived: 'neutral',
};
