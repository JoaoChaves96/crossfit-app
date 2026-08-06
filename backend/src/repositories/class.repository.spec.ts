import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClassRepository } from './class.repository';
import { ClassEntity } from '../domain/class/entities/class.entity';

describe('ClassRepository.findMatchingOccurrences', () => {
  let repo: ClassRepository;
  const find = jest.fn();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ClassRepository,
        { provide: getRepositoryToken(ClassEntity), useValue: { find } },
      ],
    }).compile();
    repo = moduleRef.get(ClassRepository);
    find.mockReset();
  });

  it('queries non-deleted classes matching all shared fields, dates, and time', async () => {
    find.mockResolvedValueOnce([{ scheduledDate: '2026-08-03' }]);
    const result = await repo.findMatchingOccurrences({
      gymId: 'g1',
      classTypeId: 'ct1',
      coachUserId: 'c1',
      spaceId: 's1',
      dates: ['2026-08-03', '2026-08-05'],
      scheduledTime: '08:00',
    });
    expect(find).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ scheduledDate: '2026-08-03' }]);
  });
});
