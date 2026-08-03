import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { isUUID } from 'class-validator';

/**
 * Params that are route tokens, not UUIDs, and must never be UUID-validated.
 */
const NON_UUID_PARAMS = new Set(['token', 'inviteToken']);

/**
 * Global pipe that validates route params whose name ends in "Id"
 * (e.g. gymId, classId, bookingId) as UUIDs, rejecting malformed
 * values with a 400 before they reach the database.
 *
 * It intentionally skips invite route tokens (`token`, `inviteToken`)
 * which are not UUIDs.
 */
@Injectable()
export class UuidParamPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    const { type, data } = metadata;

    if (type !== 'param' || typeof data !== 'string') {
      return value;
    }

    if (NON_UUID_PARAMS.has(data)) {
      return value;
    }

    if (!data.endsWith('Id')) {
      return value;
    }

    if (!isUUID(value)) {
      throw new BadRequestException(
        `Invalid ${data}: "${value}" is not a valid UUID`,
      );
    }

    return value;
  }
}
