import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';
import { QueryFailedFilter } from './query-failed.filter';

function buildHost(): {
  host: ArgumentsHost;
  response: Record<string, unknown>;
} {
  const response: Record<string, unknown> = {};
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

function buildQueryFailedError(code: string): QueryFailedError {
  const err = new QueryFailedError(
    'SELECT ...',
    [],
    new Error('driver error') as unknown as Error,
  );
  (err as unknown as { code: string }).code = code;
  return err;
}

describe('QueryFailedFilter', () => {
  let reply: jest.Mock;
  let filter: QueryFailedFilter;

  beforeEach(() => {
    reply = jest.fn();
    const adapterHost = {
      httpAdapter: { reply },
    } as unknown as HttpAdapterHost;
    filter = new QueryFailedFilter(adapterHost);
  });

  it('maps Postgres 22P02 (invalid text representation) to 400', () => {
    const { host, response } = buildHost();
    const exception = buildQueryFailedError('22P02');

    filter.catch(exception, host);

    expect(reply).toHaveBeenCalledTimes(1);
    const [replyResponse, body, status] = reply.mock.calls[0];
    expect(replyResponse).toBe(response);
    expect(status).toBe(HttpStatus.BAD_REQUEST);
    expect(body).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
    });
  });

  it('re-throws any other QueryFailedError unchanged', () => {
    const { host } = buildHost();
    const exception = buildQueryFailedError('23505');

    expect(() => filter.catch(exception, host)).toThrow(exception);
    expect(reply).not.toHaveBeenCalled();
  });
});
