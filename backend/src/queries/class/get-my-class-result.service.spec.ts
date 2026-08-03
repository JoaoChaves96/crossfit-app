import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetMyClassResultService } from './get-my-class-result.service';
import { ClassRepository } from '../../repositories/class.repository';
import { ResultRepository } from '../../repositories/result.repository';

describe('GetMyClassResultService', () => {
  let service: GetMyClassResultService;
  let classRepository: { getClassById: jest.Mock };
  let resultRepository: { getResultByUserAndClass: jest.Mock };

  const gymId = 'gym-1';
  const classId = 'class-1';
  const athleteA = 'athlete-a';
  const athleteB = 'athlete-b';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMyClassResultService,
        {
          provide: ClassRepository,
          useValue: { getClassById: jest.fn() },
        },
        {
          provide: ResultRepository,
          useValue: { getResultByUserAndClass: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(GetMyClassResultService);
    classRepository = module.get(ClassRepository);
    resultRepository = module.get(ResultRepository);
  });

  it('returns the caller own result when one exists', async () => {
    classRepository.getClassById.mockResolvedValue({ id: classId, gymId });
    const resultEntity = {
      id: 'result-1',
      userId: athleteA,
      classId,
      metricType: 'time',
      value: '180',
      unit: 'seconds',
      notes: null,
      loggedAt: new Date('2026-01-01T00:00:00.000Z'),
      editedAt: null,
    };
    resultRepository.getResultByUserAndClass.mockResolvedValue(resultEntity);

    const response = await service.getMyClassResult(gymId, classId, athleteA);

    expect(resultRepository.getResultByUserAndClass).toHaveBeenCalledWith(
      athleteA,
      classId,
    );
    expect(response.result).not.toBeNull();
    expect(response.result?.id).toBe('result-1');
    expect(response.result?.userId).toBe(athleteA);
    expect(response.result?.value).toBe('180');
  });

  it('returns null result when the caller has none (no 404)', async () => {
    classRepository.getClassById.mockResolvedValue({ id: classId, gymId });
    resultRepository.getResultByUserAndClass.mockResolvedValue(null);

    const response = await service.getMyClassResult(gymId, classId, athleteA);

    expect(response.result).toBeNull();
  });

  it('throws NotFound when the class does not exist', async () => {
    classRepository.getClassById.mockResolvedValue(null);

    await expect(
      service.getMyClassResult(gymId, classId, athleteA),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(resultRepository.getResultByUserAndClass).not.toHaveBeenCalled();
  });

  it('throws NotFound when the class belongs to another gym (cross-gym rejected)', async () => {
    classRepository.getClassById.mockResolvedValue({
      id: classId,
      gymId: 'other-gym',
    });

    await expect(
      service.getMyClassResult(gymId, classId, athleteA),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(resultRepository.getResultByUserAndClass).not.toHaveBeenCalled();
  });

  it('scopes the result query to the caller (athlete A never receives athlete B result)', async () => {
    classRepository.getClassById.mockResolvedValue({ id: classId, gymId });
    // Repository is queried by (userId, classId); simulate B having a result
    // but A having none.
    resultRepository.getResultByUserAndClass.mockImplementation(
      (userId: string) =>
        userId === athleteB
          ? Promise.resolve({
              id: 'result-b',
              userId: athleteB,
              classId,
              metricType: 'time',
              value: '999',
              unit: 'seconds',
              notes: null,
              loggedAt: new Date(),
              editedAt: null,
            })
          : Promise.resolve(null),
    );

    const response = await service.getMyClassResult(gymId, classId, athleteA);

    expect(resultRepository.getResultByUserAndClass).toHaveBeenCalledWith(
      athleteA,
      classId,
    );
    expect(response.result).toBeNull();
  });
});
