import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  function controllerWith(query: jest.Mock): HealthController {
    return new HealthController({ query } as unknown as DataSource);
  }

  it('reports ok when the database answers', async () => {
    const query = jest.fn().mockResolvedValue([{ '1': 1 }]);

    await expect(controllerWith(query).check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('throws 503 when the database ping fails', async () => {
    const query = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(controllerWith(query).check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('does not leak the driver error message to the caller', async () => {
    const query = jest
      .fn()
      .mockRejectedValue(
        new Error('password authentication failed for user "postgres"'),
      );

    await expect(controllerWith(query).check()).rejects.toThrow(
      /database unavailable/i,
    );
    await expect(controllerWith(query).check()).rejects.not.toThrow(/password/);
  });
});
