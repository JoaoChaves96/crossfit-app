/**
 * ClassScheduleItemDto: A single class in the athlete's schedule
 *
 * This DTO represents class data as presented to an athlete
 * in the "Class Schedule" screen. It includes only the fields
 * needed for rendering the schedule view.
 */
export class ClassScheduleItemDto {
  /** Unique identifier for the class */
  id: string;

  /** The type of class (e.g., CrossFit, Gymnastics) */
  classTypeId: string;

  /** Human-readable name of the class type */
  classTypeName: string;

  /** Date the class is scheduled, YYYY-MM-DD format */
  scheduledDate: string;

  /** Time the class starts, HH:mm format */
  scheduledTime: string;

  /** Full name of the coach leading the class */
  coachName: string;

  /** Total capacity of the class */
  capacity: number;

  /** Number of booked (confirmed) spots */
  bookedCount: number;

  /** Current state of the class in its lifecycle */
  state:
    | 'published'
    | 'booking_closed'
    | 'in_progress'
    | 'completed'
    | 'archived';
}
