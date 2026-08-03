import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { UuidParamPipe } from './uuid-param.pipe';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

function paramMeta(name: string): ArgumentMetadata {
  return { type: 'param', data: name, metatype: String };
}

describe('UuidParamPipe', () => {
  let pipe: UuidParamPipe;

  beforeEach(() => {
    pipe = new UuidParamPipe();
  });

  it('accepts a valid UUID for an *Id param', () => {
    expect(pipe.transform(VALID_UUID, paramMeta('classId'))).toBe(VALID_UUID);
    expect(pipe.transform(VALID_UUID, paramMeta('gymId'))).toBe(VALID_UUID);
    expect(pipe.transform(VALID_UUID, paramMeta('bookingId'))).toBe(VALID_UUID);
  });

  it('rejects a malformed UUID for an *Id param with 400', () => {
    expect(() => pipe.transform('non-existent-id', paramMeta('classId'))).toThrow(
      BadRequestException,
    );
    expect(() => pipe.transform('123', paramMeta('gymId'))).toThrow(
      BadRequestException,
    );
  });

  it('skips the invite token param (not a UUID)', () => {
    expect(pipe.transform('abc123xyz', paramMeta('token'))).toBe('abc123xyz');
  });

  it('skips the invite inviteToken param (not a UUID)', () => {
    expect(pipe.transform('abc123xyz', paramMeta('inviteToken'))).toBe(
      'abc123xyz',
    );
  });

  it('skips params that do not end in "Id"', () => {
    expect(pipe.transform('not-a-uuid', paramMeta('id'))).toBe('not-a-uuid');
    expect(pipe.transform('anything', paramMeta('name'))).toBe('anything');
  });

  it('skips non-param arguments (e.g. body) unchanged', () => {
    const meta: ArgumentMetadata = { type: 'body', data: 'classId', metatype: String };
    expect(pipe.transform('non-uuid-body', meta)).toBe('non-uuid-body');
  });
});
