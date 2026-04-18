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
   * Count waitlisted bookings for a class
   */
  async countWaitlistedBookings(classId: string): Promise<number> {
    return this.bookingRepository.count({
      where: { classId, status: 'waitlisted' },
    });
  }
}
