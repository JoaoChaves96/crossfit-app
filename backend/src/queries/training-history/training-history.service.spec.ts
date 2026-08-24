import { Test } from '@nestjs/testing';
import { TrainingHistoryService } from './training-history.service';
import { AttendanceRepository } from '../../repositories/attendance.repository';
import { ResultRepository } from '../../repositories/result.repository';
import { AttendanceEntity } from '../../domain/attendance/entities/attendance.entity';
import { ResultEntity } from '../../domain/result/entities/result.entity';

const USER_ID = 'athlete-1';
const GYM_ID = 'gym-1';

/**
 * An attendance row as the repository returns it: the class and its class type
 * are inner-joined, the coach left-joined (so it may be absent).
 */
function buildAttendance(overrides: {
  classId: string;
  scheduledDate?: Date | string;
  scheduledTime?: string;
  state?: string;
  className?: string;
  coachName?: string | null;
}) {
  return {
    id: `attendance-${overrides.classId}`,
    classId: overrides.classId,
    userId: USER_ID,
    present: true,
    class: {
      id: overrides.classId,
      gymId: GYM_ID,
      scheduledDate: overrides.scheduledDate ?? new Date('2026-03-14T00:00:00.000Z'),
      scheduledTime: overrides.scheduledTime ?? '09:30:00',
      state: overrides.state ?? 'completed',
      classType: { name: overrides.className ?? 'CrossFit WOD' },
      coach:
        overrides.coachName === null
          ? null
          : { name: overrides.coachName ?? 'Coach Ana' },
    },
  } as unknown as AttendanceEntity;
}

function buildResult(overrides: { classId: string; value?: string }) {
  return {
    id: `result-${overrides.classId}`,
    classId: overrides.classId,
    userId: USER_ID,
    metricType: 'time',
    value: overrides.value ?? '300',
    unit: 'seconds',
    notes: null,
    loggedAt: new Date('2026-03-14T11:00:00.000Z'),
    editedAt: null,
  } as unknown as ResultEntity;
}

describe('TrainingHistoryService', () => {
  let service: TrainingHistoryService;
  const getPresentAttendanceByUserAndGym = jest.fn();
  const getResultsByUserAndClassIds = jest.fn();

  beforeEach(async () => {
    [getPresentAttendanceByUserAndGym, getResultsByUserAndClassIds].forEach(
      (m) => m.mockReset(),
    );
    getResultsByUserAndClassIds.mockResolvedValue([]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        TrainingHistoryService,
        {
          provide: AttendanceRepository,
          useValue: { getPresentAttendanceByUserAndGym },
        },
        {
          provide: ResultRepository,
          useValue: { getResultsByUserAndClassIds },
        },
      ],
    }).compile();

    service = moduleRef.get(TrainingHistoryService);
  });

  describe('scoping', () => {
    it('scopes the attendance query to the caller, the gym, and finished classes only', async () => {
      getPresentAttendanceByUserAndGym.mockResolvedValue([]);

      await service.getTrainingHistory(USER_ID, GYM_ID);

      expect(getPresentAttendanceByUserAndGym).toHaveBeenCalledWith(
        USER_ID,
        GYM_ID,
        ['completed', 'archived'],
      );
    });

    it('queries results for the caller only, and only for the classes they attended', async () => {
      getPresentAttendanceByUserAndGym.mockResolvedValue([
        buildAttendance({ classId: 'class-a' }),
        buildAttendance({ classId: 'class-b' }),
      ]);

      await service.getTrainingHistory(USER_ID, GYM_ID);

      expect(getResultsByUserAndClassIds).toHaveBeenCalledWith(USER_ID, [
        'class-a',
        'class-b',
      ]);
    });

    it('returns an empty history and does not query results at all when nothing was attended', async () => {
      getPresentAttendanceByUserAndGym.mockResolvedValue([]);

      await expect(
        service.getTrainingHistory(USER_ID, GYM_ID),
      ).resolves.toEqual({ history: [] });

      expect(getResultsByUserAndClassIds).not.toHaveBeenCalled();
    });
  });

  describe('mapping', () => {
    it('maps an attended class together with its logged result', async () => {
      getPresentAttendanceByUserAndGym.mockResolvedValue([
        buildAttendance({ classId: 'class-a' }),
      ]);
      getResultsByUserAndClassIds.mockResolvedValue([
        buildResult({ classId: 'class-a' }),
      ]);

      const { history } = await service.getTrainingHistory(USER_ID, GYM_ID);

      expect(history).toEqual([
        {
          classId: 'class-a',
          className: 'CrossFit WOD',
          coachName: 'Coach Ana',
          scheduledAt: '2026-03-14T09:30:00',
          classState: 'completed',
          result: {
            id: 'result-class-a',
            metricType: 'time',
            value: '300',
            unit: 'seconds',
            notes: null,
            loggedAt: new Date('2026-03-14T11:00:00.000Z'),
            editedAt: null,
          },
        },
      ]);
    });

    it('maps an attended class with no logged result to a null result', async () => {
      getPresentAttendanceByUserAndGym.mockResolvedValue([
        buildAttendance({ classId: 'class-a' }),
      ]);

      const { history } = await service.getTrainingHistory(USER_ID, GYM_ID);

      expect(history[0].result).toBeNull();
    });

    it('attaches each result to its own class rather than bleeding one across the list', async () => {
      getPresentAttendanceByUserAndGym.mockResolvedValue([
        buildAttendance({ classId: 'class-a' }),
        buildAttendance({ classId: 'class-b' }),
        buildAttendance({ classId: 'class-c' }),
      ]);
      getResultsByUserAndClassIds.mockResolvedValue([
        buildResult({ classId: 'class-c', value: '999' }),
      ]);

      const { history } = await service.getTrainingHistory(USER_ID, GYM_ID);

      expect(history.map((h) => h.result?.value ?? null)).toEqual([
        null,
        null,
        '999',
      ]);
    });

    it("falls back to 'Unknown Coach' when the class has no coach joined", async () => {
      getPresentAttendanceByUserAndGym.mockResolvedValue([
        buildAttendance({ classId: 'class-a', coachName: null }),
      ]);

      const { history } = await service.getTrainingHistory(USER_ID, GYM_ID);

      expect(history[0].coachName).toBe('Unknown Coach');
    });

    it('preserves the order the repository returned, which is the ordering contract', async () => {
      getPresentAttendanceByUserAndGym.mockResolvedValue([
        buildAttendance({ classId: 'newer', scheduledDate: new Date('2026-03-20T00:00:00.000Z') }),
        buildAttendance({ classId: 'older', scheduledDate: new Date('2026-03-01T00:00:00.000Z') }),
      ]);

      const { history } = await service.getTrainingHistory(USER_ID, GYM_ID);

      expect(history.map((h) => h.classId)).toEqual(['newer', 'older']);
    });

    it('reports the archived state as well as completed', async () => {
      getPresentAttendanceByUserAndGym.mockResolvedValue([
        buildAttendance({ classId: 'class-a', state: 'archived' }),
      ]);

      const { history } = await service.getTrainingHistory(USER_ID, GYM_ID);

      expect(history[0].classState).toBe('archived');
    });
  });

  describe('scheduledAt', () => {
    it('combines a Date scheduledDate with the time string', async () => {
      getPresentAttendanceByUserAndGym.mockResolvedValue([
        buildAttendance({
          classId: 'class-a',
          scheduledDate: new Date('2026-03-14T00:00:00.000Z'),
          scheduledTime: '18:45:00',
        }),
      ]);

      const { history } = await service.getTrainingHistory(USER_ID, GYM_ID);

      expect(history[0].scheduledAt).toBe('2026-03-14T18:45:00');
    });

    it('combines a string scheduledDate with the time string, which is what the pg driver yields for a date column', async () => {
      getPresentAttendanceByUserAndGym.mockResolvedValue([
        buildAttendance({
          classId: 'class-a',
          scheduledDate: '2026-03-14',
          scheduledTime: '06:00:00',
        }),
      ]);

      const { history } = await service.getTrainingHistory(USER_ID, GYM_ID);

      expect(history[0].scheduledAt).toBe('2026-03-14T06:00:00');
    });

    it('emits no zone designator, so the time is read as the gym\'s wall clock and not shifted', async () => {
      getPresentAttendanceByUserAndGym.mockResolvedValue([
        buildAttendance({ classId: 'class-a', scheduledTime: '09:30:00' }),
      ]);

      const { history } = await service.getTrainingHistory(USER_ID, GYM_ID);

      expect(history[0].scheduledAt).not.toMatch(/Z|[+-]\d{2}:\d{2}$/);
    });
  });
});
