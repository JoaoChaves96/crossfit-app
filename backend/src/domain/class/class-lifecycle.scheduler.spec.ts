import { Test, TestingModule } from '@nestjs/testing';
import { ClassLifecycleScheduler } from './class-lifecycle.scheduler';
import { ClassRepository } from '../../repositories/class.repository';
import { ClassEntity } from './entities/class.entity';

describe('ClassLifecycleScheduler', () => {
  let scheduler: ClassLifecycleScheduler;
  let classRepository: {
    getClassesByStates: jest.Mock;
    saveMany: jest.Mock;
  };

  // Class starts 2026-08-12T10:00:00Z, runs 60 minutes.
  const START = '2026-08-12T10:00:00Z';

  const buildClass = (
    state: ClassEntity['state'],
    overrides: Partial<ClassEntity> = {},
  ): ClassEntity =>
    ({
      id: 'class-1',
      state,
      // `@Column('date')` hydrates as a bare 'YYYY-MM-DD' string, never a Date.
      scheduledDate: '2026-08-12' as unknown as Date,
      scheduledTime: '10:00',
      duration: 60,
      ...overrides,
    }) as ClassEntity;

  /** Runs a tick with the wall clock pinned to `now`, returns the saved rows. */
  const tickAt = async (now: string, classes: ClassEntity[]) => {
    jest.setSystemTime(new Date(now));
    classRepository.getClassesByStates.mockResolvedValue(classes);
    await scheduler.advanceClassStates();
    return classRepository.saveMany.mock.calls[0]?.[0] ?? [];
  };

  beforeEach(async () => {
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassLifecycleScheduler,
        {
          provide: ClassRepository,
          useValue: {
            getClassesByStates: jest.fn(),
            saveMany: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    scheduler = module.get(ClassLifecycleScheduler);
    classRepository = module.get(ClassRepository);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // The booking-close lead time defines exactly how long the waitlist is inert:
  // cancellation is the only promotion path and it rejects any class past
  // `published`, so a seat freed inside this window can never be reassigned
  // (see DECISIONS.md → Absence Does Not Promote). Five minutes is the ratified
  // value; widening it silently widens that dead window.
  describe('booking closes 5 minutes before the class starts', () => {
    it('leaves a class published 6 minutes before start', async () => {
      const saved = await tickAt('2026-08-12T09:54:00Z', [buildClass('published')]);

      expect(saved).toHaveLength(0);
    });

    it('closes booking exactly 5 minutes before start', async () => {
      const saved = await tickAt('2026-08-12T09:55:00Z', [buildClass('published')]);

      expect(saved).toHaveLength(1);
      expect(saved[0].state).toBe('booking_closed');
    });

    it('still only closes booking - not starts the class - 1 minute before start', async () => {
      const saved = await tickAt('2026-08-12T09:59:00Z', [buildClass('published')]);

      expect(saved[0].state).toBe('booking_closed');
    });
  });

  describe('the remaining transitions', () => {
    it('starts a booking_closed class at its scheduled time', async () => {
      const saved = await tickAt(START, [buildClass('booking_closed')]);

      expect(saved[0].state).toBe('in_progress');
    });

    it('completes an in_progress class once its duration has elapsed', async () => {
      const saved = await tickAt('2026-08-12T11:00:00Z', [buildClass('in_progress')]);

      expect(saved[0].state).toBe('completed');
    });

    it('leaves an in_progress class alone while it is still running', async () => {
      const saved = await tickAt('2026-08-12T10:30:00Z', [buildClass('in_progress')]);

      expect(saved).toHaveLength(0);
    });

    it('does not save anything when no class is due to transition', async () => {
      await tickAt('2026-08-12T08:00:00Z', [buildClass('published')]);

      expect(classRepository.saveMany).not.toHaveBeenCalled();
    });
  });
});
