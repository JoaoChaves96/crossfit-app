import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LogResultHandler } from './log-result.handler';
import { LogResultCommand } from '../log-result.command';
import { ClassRepository } from '../../../repositories/class.repository';
import { AttendanceRepository } from '../../../repositories/attendance.repository';
import { ResultRepository } from '../../../repositories/result.repository';
import { ResultEntity } from '../../../domain/result/entities/result.entity';

describe('LogResultHandler', () => {
  let handler: LogResultHandler;
  let classRepository: ClassRepository;
  let attendanceRepository: AttendanceRepository;
  let resultRepository: ResultRepository;
  let resultDbRepository: { save: jest.Mock };

  const mockUserId = 'user-123';
  const mockClassId = 'class-123';

  const completedClassWithLoggableType = {
    id: mockClassId,
    state: 'completed',
    classType: {
      loggable: true,
      resultMetrics: 'reps',
    },
  };

  const baseCommand = new LogResultCommand(
    mockUserId,
    mockClassId,
    'reps',
    '25',
    'reps',
  );

  beforeEach(async () => {
    resultDbRepository = { save: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogResultHandler,
        {
          provide: ClassRepository,
          useValue: {
            getClassById: jest.fn(),
          },
        },
        {
          provide: AttendanceRepository,
          useValue: {
            getAttendanceByUserAndClass: jest.fn(),
          },
        },
        {
          provide: ResultRepository,
          useValue: {
            getResultByUserAndClass: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ResultEntity),
          useValue: resultDbRepository,
        },
      ],
    }).compile();

    handler = module.get<LogResultHandler>(LogResultHandler);
    classRepository = module.get<ClassRepository>(ClassRepository);
    attendanceRepository = module.get<AttendanceRepository>(AttendanceRepository);
    resultRepository = module.get<ResultRepository>(ResultRepository);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should throw NotFoundException when class does not exist', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(null);

      await expect(handler.execute(baseCommand)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when class is not in completed state', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
        id: mockClassId,
        state: 'in_progress',
        classType: { loggable: true, resultMetrics: 'reps' },
      } as any);

      await expect(handler.execute(baseCommand)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when athlete has no attendance record', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(completedClassWithLoggableType as any);
      jest.spyOn(attendanceRepository, 'getAttendanceByUserAndClass').mockResolvedValue(null);

      await expect(handler.execute(baseCommand)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when athlete attendance is present = false', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(completedClassWithLoggableType as any);
      jest.spyOn(attendanceRepository, 'getAttendanceByUserAndClass').mockResolvedValue({
        userId: mockUserId,
        classId: mockClassId,
        present: false,
      } as any);

      await expect(handler.execute(baseCommand)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when class type is not loggable', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
        id: mockClassId,
        state: 'completed',
        classType: { loggable: false, resultMetrics: 'reps' },
      } as any);
      jest.spyOn(attendanceRepository, 'getAttendanceByUserAndClass').mockResolvedValue({
        userId: mockUserId,
        classId: mockClassId,
        present: true,
      } as any);

      await expect(handler.execute(baseCommand)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when result already exists for this athlete+class', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(completedClassWithLoggableType as any);
      jest.spyOn(attendanceRepository, 'getAttendanceByUserAndClass').mockResolvedValue({
        userId: mockUserId,
        classId: mockClassId,
        present: true,
      } as any);
      jest.spyOn(resultRepository, 'getResultByUserAndClass').mockResolvedValue({
        id: 'existing-result-id',
        userId: mockUserId,
        classId: mockClassId,
      } as any);

      await expect(handler.execute(baseCommand)).rejects.toThrow(ConflictException);
    });

    it('should create and return a result when all preconditions are met (happy path)', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(completedClassWithLoggableType as any);
      jest.spyOn(attendanceRepository, 'getAttendanceByUserAndClass').mockResolvedValue({
        userId: mockUserId,
        classId: mockClassId,
        present: true,
      } as any);
      jest.spyOn(resultRepository, 'getResultByUserAndClass').mockResolvedValue(null);

      const savedResult: ResultEntity = {
        id: 'new-result-id',
        classId: mockClassId,
        userId: mockUserId,
        metricType: 'reps',
        value: '25',
        unit: 'reps',
        notes: null,
        loggedAt: new Date(),
        editedAt: null,
      } as ResultEntity;

      const saveSpy = jest.spyOn(resultRepository, 'save').mockResolvedValue(savedResult);

      const result = await handler.execute(baseCommand);

      expect(result).toBeDefined();
      expect(result.classId).toBe(mockClassId);
      expect(result.userId).toBe(mockUserId);
      expect(result.metricType).toBe('reps');
      expect(result.value).toBe('25');
      expect(result.unit).toBe('reps');
      expect(saveSpy).toHaveBeenCalledTimes(1);

      const savedEntity = saveSpy.mock.calls[0][0] as ResultEntity;
      expect(savedEntity.classId).toBe(mockClassId);
      expect(savedEntity.userId).toBe(mockUserId);
      expect(savedEntity.id).toBeTruthy();
    });

    it('should throw BadRequestException when unit does not match metric type', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(completedClassWithLoggableType as any);
      jest.spyOn(attendanceRepository, 'getAttendanceByUserAndClass').mockResolvedValue({
        userId: mockUserId,
        classId: mockClassId,
        present: true,
      } as any);
      jest.spyOn(resultRepository, 'getResultByUserAndClass').mockResolvedValue(null);

      const commandWithBadUnit = new LogResultCommand(
        mockUserId,
        mockClassId,
        'reps',
        '25',
        'kg', // invalid unit for reps
      );

      await expect(handler.execute(commandWithBadUnit)).rejects.toThrow(BadRequestException);
    });
  });
});
