import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../domain/booking/entities/booking.entity';

/**
 * BookingRepository: Pure persistence layer for bookings
 *
 * Responsibilities:
 * - Persist BookingEntity instances
 * - Query/retrieve BookingEntity instances
 * - Validate existence and status
 *
 * MUST NOT:
 * - Create domain entities
 * - Decide initial state or timestamps
 * - Execute promotion logic (belongs to handler)
 */
@Injectable()
export class BookingRepository {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
  ) {}

  /**
   * Persist a BookingEntity to the database
   */
  async save(bookingEntity: BookingEntity): Promise<BookingEntity> {
    return this.bookingRepository.save(bookingEntity);
  }

  /**
   * Retrieve a booking by ID
   */
  async getBookingById(bookingId: string): Promise<BookingEntity | null> {
    return this.bookingRepository.findOne({
      where: { id: bookingId },
    });
  }

  /**
   * Retrieve booking for a specific user and class
   */
  async getBookingByUserAndClass(
    userId: string,
    classId: string,
  ): Promise<BookingEntity | null> {
    return this.bookingRepository.findOne({
      where: { userId, classId },
    });
  }

  /**
   * Retrieve all non-cancelled bookings for a class
   */
  async getActiveBookingsByClass(classId: string): Promise<BookingEntity[]> {
    return this.bookingRepository.find({
      where: { classId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Retrieve all booked (non-waitlisted, non-cancelled) bookings for a class
   */
  async getBookedBookingsByClass(classId: string): Promise<BookingEntity[]> {
    return this.bookingRepository.find({
      where: { classId, status: 'booked' },
    });
  }

  /**
   * Retrieve all waitlisted bookings for a class, ordered by position
   */
  async getWaitlistedBookingsByClass(
    classId: string,
  ): Promise<BookingEntity[]> {
    return this.bookingRepository.find({
      where: { classId, status: 'waitlisted' },
      order: { bookedPosition: 'ASC' },
    });
  }

  /**
   * Retrieve first waitlisted booking for a class
   */
  async getFirstWaitlistedBooking(
    classId: string,
  ): Promise<BookingEntity | null> {
    return this.bookingRepository.findOne({
      where: { classId, status: 'waitlisted' },
      order: { bookedPosition: 'ASC' },
    });
  }

  /**
   * Count booked bookings for a class
   */
  async countBookedBookings(classId: string): Promise<number> {
    return this.bookingRepository.count({
      where: { classId, status: 'booked' },
    });
  }

  /**
   * Count booked bookings for many classes in one grouped query.
   *
   * The per-class `countBookedBookings` above is correct but costs one query per
   * class, so rendering a schedule of N classes cost N+1 queries. This is the
   * same count, aggregated once and joined onto the rows in memory by the caller.
   *
   * The status filter must stay identical to `countBookedBookings`: only
   * 'booked' rows are spots taken. Waitlisted and cancelled bookings live on the
   * same class, so counting them would silently overstate capacity.
   *
   * Gym scoping is the caller's: the ids passed in come from an already
   * gym-scoped class query, and the `IN` clause is what carries that scoping
   * into the aggregate.
   *
   * @param classIds - Classes to count for; ids not in this list are not touched
   * @returns classId → booked count. Classes with no booked bookings are ABSENT
   *          from the map (no GROUP BY row exists for them), so callers must
   *          default a missing key to 0.
   */
  async countBookedBookingsByClasses(
    classIds: string[],
  ): Promise<Map<string, number>> {
    // `IN ()` is a Postgres syntax error, and there is nothing to ask for.
    if (classIds.length === 0) {
      return new Map();
    }

    const rows = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('booking.classId', 'classId')
      .addSelect('COUNT(*)', 'count')
      .where('booking.classId IN (:...classIds)', { classIds })
      .andWhere('booking.status = :status', { status: 'booked' })
      .groupBy('booking.classId')
      .getRawMany<{ classId: string; count: string }>();

    // pg hands COUNT(*) back as a string; left unconverted it would serialise
    // into the API response as "3" and break every capacity comparison.
    return new Map(rows.map((row) => [row.classId, Number(row.count)]));
  }

  /**
   * Count waitlisted bookings for a class
   */
  async countWaitlistedBookings(classId: string): Promise<number> {
    return this.bookingRepository.count({
      where: { classId, status: 'waitlisted' },
    });
  }

  /**
   * Retrieve all active bookings (booked or waitlisted) for a specific user
   */
  async getActiveBookingsByUser(userId: string): Promise<BookingEntity[]> {
    return this.bookingRepository.find({
      where: [
        { userId, status: 'booked' },
        { userId, status: 'waitlisted' },
      ],
      order: { createdAt: 'DESC' },
    });
  }
}
