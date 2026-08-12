import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { CreateRecurringClassesCommand } from '../create-recurring-classes.command';
import { CreateRecurringClassesResponseDto } from '../dto/create-recurring-classes-response.dto';
import { ClassRepository } from '../../../repositories/class.repository';
import { ClassEntity } from '../../../domain/class/entities/class.entity';
import { ClassSeriesEntity } from '../../../domain/class-series/entities/class-series.entity';
import { GymService } from '../../../domain/gym/gym.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { SpaceService } from '../../../domain/space/space.service';
import { ClassTypeService } from '../../../domain/class-type/class-type.service';
import { notFound, forbidden, invalidState } from '../../../http/exceptions';
import { expandOccurrences } from '../recurrence/expand-occurrences';
import { toPersistedCalendarDay } from '../../../domain/shared/calendar-day';

/**
 * CreateRecurringClassesHandler: generates a series of classes from a weekly
 * recurrence rule.
 *
 * Mirrors the same preconditions as single-class creation (owner, gym, class
 * type, coach, space, capacity), then expands the rule into concrete dates,
 * skips past and exact-duplicate occurrences, and persists a ClassSeries plus
 * one ClassEntity per surviving occurrence.
 */
@CommandHandler(CreateRecurringClassesCommand)
export class CreateRecurringClassesHandler
  implements ICommandHandler<CreateRecurringClassesCommand>
{
  constructor(
    @Inject(ClassRepository) private readonly classRepository: ClassRepository,
    @Inject(GymService) private readonly gymService: GymService,
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @Inject(SpaceService) private readonly spaceService: SpaceService,
    @Inject(ClassTypeService)
    private readonly classTypeService: ClassTypeService,
    @Inject(DataSource) private readonly dataSource: DataSource,
  ) {}

  async execute(
    command: CreateRecurringClassesCommand,
  ): Promise<CreateRecurringClassesResponseDto> {
    const { userId, gymId, dto } = command;

    // Rule validation
    if (dto.weekdays.some((w) => w < 0 || w > 6)) {
      throw invalidState('weekdays must be between 0 and 6');
    }
    const start = new Date(`${dto.startDate}T00:00:00.000Z`);
    const end = new Date(`${dto.endDate}T00:00:00.000Z`);
    if (end.getTime() < start.getTime()) {
      throw invalidState('endDate must be on or after startDate');
    }
    const sixMonthsOut = new Date(start);
    sixMonthsOut.setUTCMonth(sixMonthsOut.getUTCMonth() + 6);
    if (end.getTime() > sixMonthsOut.getTime()) {
      throw invalidState('Recurring series cannot span more than 6 months');
    }

    // Shared-entity preconditions (mirror create-class)
    if (!(await this.gymStaffService.isGymOwner(userId, gymId))) {
      throw forbidden('User is not a gym owner for this gym');
    }
    const gym = await this.gymService.getGymById(gymId);
    if (!gym) throw notFound('Gym not found');
    if (gym.status !== 'active') throw invalidState('Gym is not active');

    const classType = await this.classTypeService.getClassTypeById(
      dto.classTypeId,
    );
    if (!classType) throw notFound('ClassType not found');
    if (classType.gymId !== gymId) {
      throw invalidState('ClassType does not belong to this gym');
    }

    const coachStaff = await this.gymStaffService.getGymStaffByUserAndGym(
      dto.coachUserId,
      gymId,
    );
    if (!coachStaff) throw notFound('Coach is not assigned to this gym');
    if (coachStaff.role !== 'coach' && coachStaff.role !== 'owner') {
      throw invalidState('Staff member cannot be assigned as a coach');
    }
    if (coachStaff.status !== 'active') {
      throw invalidState('Coach is not active');
    }

    const space = await this.spaceService.getSpaceById(dto.spaceId);
    if (!space) throw notFound('Space not found');
    if (space.gymId !== gymId) {
      throw invalidState('Space does not belong to this gym');
    }

    const capacity = dto.capacity ?? space.baseCapacity;
    if (capacity <= 0) throw invalidState('Capacity must be greater than 0');
    const duration = dto.duration ?? 60;

    // Expand + filter. expandOccurrences steps day-by-day in UTC and returns
    // YYYY-MM-DD strings, so compare occurrence instants in UTC too to keep the
    // past-skip deterministic regardless of the host machine's timezone.
    const allDates = expandOccurrences({
      startDate: dto.startDate,
      endDate: dto.endDate,
      weekdays: dto.weekdays,
    });

    const now = new Date();
    let skippedPast = 0;
    const futureDates = allDates.filter((date) => {
      const dt = new Date(`${date}T${dto.scheduledTime}:00.000Z`);
      if (dt.getTime() <= now.getTime()) {
        skippedPast++;
        return false;
      }
      return true;
    });

    const existing = await this.classRepository.findMatchingOccurrences({
      gymId,
      classTypeId: dto.classTypeId,
      coachUserId: dto.coachUserId,
      spaceId: dto.spaceId,
      dates: futureDates,
      scheduledTime: dto.scheduledTime,
    });
    const existingDates = new Set(existing.map((e) => e.scheduledDate));
    let skippedDuplicate = 0;
    const finalDates = futureDates.filter((date) => {
      if (existingDates.has(date)) {
        skippedDuplicate++;
        return false;
      }
      return true;
    });

    if (finalDates.length === 0) {
      return { seriesId: null, created: 0, skippedPast, skippedDuplicate };
    }

    // Build the series + classes, then persist both in ONE transaction so a
    // failure to save the classes never leaves an orphaned ClassSeries row.
    const seriesId = uuid();
    const series = new ClassSeriesEntity();
    series.id = seriesId;
    series.gymId = gymId;
    series.classTypeId = dto.classTypeId;
    series.coachUserId = dto.coachUserId;
    series.spaceId = dto.spaceId;
    series.weekdays = dto.weekdays;
    series.scheduledTime = dto.scheduledTime;
    series.duration = duration;
    series.capacity = dto.capacity ?? null;
    // `startDate`/`endDate` are `@Column('date')` too, so they take the bare days
    // rather than the `start`/`end` instants used for the rule validation above.
    series.startDate = toPersistedCalendarDay(dto.startDate);
    series.endDate = toPersistedCalendarDay(dto.endDate);
    series.createdByUserId = userId;
    series.createdAt = now;

    const classes = finalDates.map((date) => {
      const c = new ClassEntity();
      c.id = uuid();
      c.gymId = gymId;
      c.classTypeId = dto.classTypeId;
      c.coachUserId = dto.coachUserId;
      c.spaceId = dto.spaceId;
      c.scheduledDate = toPersistedCalendarDay(date);
      c.scheduledTime = dto.scheduledTime;
      c.capacity = capacity;
      c.duration = duration;
      c.state = 'published';
      c.seriesId = seriesId;
      c.createdAt = now;
      c.lastModifiedAt = now;
      c.deletedAt = null;
      return c;
    });

    // ATOMIC: series + classes commit together or not at all.
    await this.dataSource.transaction(async (manager) => {
      await manager.save(ClassSeriesEntity, series);
      await manager.save(ClassEntity, classes);
    });

    return {
      seriesId,
      created: classes.length,
      skippedPast,
      skippedDuplicate,
    };
  }
}
