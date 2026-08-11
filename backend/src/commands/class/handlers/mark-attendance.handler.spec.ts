import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MarkAttendanceHandler } from './mark-attendance.handler';
import { MarkAttendanceCommand } from '../mark-attendance.command';
import { ClassRepository } from '../../../repositories/class.repository';
import { AttendanceRepository } from '../../../repositories/attendance.repository';
import { BookingRepository } from '../../../repositories/booking.repository';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { AttendanceEntity } from '../../../domain/attendance/entities/attendance.entity';

describe('MarkAttendanceHandler', () => {
  let handler: MarkAttendanceHandler;
  let classRepository: { getClassById: jest.Mock };
  let attendanceRepository: {
    getAttendanceByUserAndClass: jest.Mock;
    save: jest.Mock;
  };
  let bookingRepository: {
    getFirstWaitlistedBooking: jest.Mock;
    getWaitlistedBookingsByClass: jest.Mock;
    save: jest.Mock;
  };
  let gymStaffService: { isCoachAssignedToClass: jest.Mock };

  const coachId = 'coach-1';
  const gymId = 'gym-1';
  const classId = 'class-1';
  const athleteId = 'athlete-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarkAttendanceHandler,
        {
          provide: ClassRepository,
          useValue: { getClassById: jest.fn() },
        },
        {
          provide: AttendanceRepository,
          useValue: {
            getAttendanceByUserAndClass: jest.fn(),
            save: jest.fn((a) => Promise.resolve(a)),
          },
        },
        {
          provide: BookingRepository,
          useValue: {
            getFirstWaitlistedBooking: jest.fn(),
            getWaitlistedBookingsByClass: jest.fn().mockResolvedValue([]),
            save: jest.fn((b) => Promise.resolve(b)),
          },
        },
        {
          provide: GymStaffService,
          useValue: { isCoachAssignedToClass: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: getRepositoryToken(AttendanceEntity),
          useValue: { save: jest.fn((a) => Promise.resolve(a)) },
        },
      ],
    }).compile();

    handler = module.get(MarkAttendanceHandler);
    classRepository = module.get(ClassRepository);
    attendanceRepository = module.get(AttendanceRepository);
    bookingRepository = module.get(BookingRepository);
    gymStaffService = module.get(GymStaffService);

    classRepository.getClassById.mockResolvedValue({
      id: classId,
      gymId,
      coachUserId: coachId,
      state: 'in_progress',
    });
  });

  const markAbsent = () =>
    handler.execute(
      new MarkAttendanceCommand(coachId, classId, gymId, [
        { athleteUserId: athleteId, present: false },
      ]),
    );

  it('marks an athlete absent', async () => {
    attendanceRepository.getAttendanceByUserAndClass.mockResolvedValue(null);

    const result = await markAbsent();

    expect(result.attendanceRecords[0].present).toBe(false);
  });

  describe('waitlist', () => {
    // Attendance is only markable once the class is in_progress or completed
    // (see the state guard in the handler), so any promotion here would add an
    // athlete to a session that is already underway or over. They are not at
    // the gym, were never notified, and still cannot log a result — LogResult
    // requires a present=true attendance record they do not have. So absence
    // must not promote at all; promotion belongs to the cancel-booking path,
    // which is guarded on state === 'published'.
    it('does not promote a waitlisted athlete when flipping present to absent', async () => {
      attendanceRepository.getAttendanceByUserAndClass.mockResolvedValue({
        id: 'att-1',
        classId,
        userId: athleteId,
        present: true,
      });
      bookingRepository.getFirstWaitlistedBooking.mockResolvedValue({
        id: 'booking-9',
        userId: 'waitlisted-athlete',
        status: 'waitlisted',
        bookedPosition: 1,
      });

      await markAbsent();

      expect(bookingRepository.getFirstWaitlistedBooking).not.toHaveBeenCalled();
      expect(bookingRepository.save).not.toHaveBeenCalled();
    });

    it('leaves the waitlist untouched when marking absent for the first time', async () => {
      attendanceRepository.getAttendanceByUserAndClass.mockResolvedValue(null);

      await markAbsent();

      expect(bookingRepository.getFirstWaitlistedBooking).not.toHaveBeenCalled();
      expect(bookingRepository.save).not.toHaveBeenCalled();
    });
  });

  it('rejects attendance while the class is still published', async () => {
    classRepository.getClassById.mockResolvedValue({
      id: classId,
      gymId,
      coachUserId: coachId,
      state: 'published',
    });

    await expect(markAbsent()).rejects.toThrow();
  });

  it('rejects a coach who is not the one assigned to the class', async () => {
    classRepository.getClassById.mockResolvedValue({
      id: classId,
      gymId,
      coachUserId: 'another-coach',
      state: 'in_progress',
    });

    await expect(markAbsent()).rejects.toThrow();
  });

  it('rejects a coach who is no longer active in the gym', async () => {
    gymStaffService.isCoachAssignedToClass.mockResolvedValue(false);

    await expect(markAbsent()).rejects.toThrow();
  });
});
