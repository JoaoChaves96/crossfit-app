import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';
import type { Response } from 'express';

/**
 * Postgres error code for "invalid text representation" — raised when a
 * malformed value (e.g. a non-UUID string) is compared against a uuid column.
 */
const PG_INVALID_TEXT_REPRESENTATION = '22P02';

/**
 * Postgres error code for "unique violation".
 */
const PG_UNIQUE_VIOLATION = '23505';

/**
 * Name of the partial unique index that enforces "at most one active plan
 * row per gym membership" (see AthleteMembershipPlanEntity). Two concurrent
 * assign/purchase calls for the same membership can both pass their
 * in-transaction precondition checks and then race to insert an active row;
 * exactly one wins and the other hits this index, which is expected and
 * should read as a conflict, not a server error.
 */
const ONE_ACTIVE_MEMBERSHIP_PLAN_INDEX =
  'IDX_athlete_membership_plans_one_active';

/**
 * Defense-in-depth filter that maps specific Postgres errors to clean HTTP
 * responses so a raw DB error can never surface as a 500:
 * - 22P02 (invalid text representation, typically a malformed UUID) → 400
 * - 23505 (unique violation) on the one-active-membership-plan index → 409
 * Any other QueryFailedError is re-thrown unchanged to preserve existing
 * behavior — this filter only maps errors it can give a clear, specific
 * meaning to.
 */
@Catch(QueryFailedError)
export class QueryFailedFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: QueryFailedError, host: ArgumentsHost): void {
    const code = (exception as unknown as { code?: string }).code;

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const httpAdapter = this.httpAdapterHost.httpAdapter;

    if (code === PG_INVALID_TEXT_REPRESENTATION) {
      httpAdapter.reply(
        response,
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid identifier format',
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );
      return;
    }

    if (
      code === PG_UNIQUE_VIOLATION &&
      (exception as unknown as { constraint?: string }).constraint ===
        ONE_ACTIVE_MEMBERSHIP_PLAN_INDEX
    ) {
      httpAdapter.reply(
        response,
        {
          statusCode: HttpStatus.CONFLICT,
          message:
            'This member already has an active membership plan assigned by a concurrent request. Please retry.',
          error: 'Conflict',
        },
        HttpStatus.CONFLICT,
      );
      return;
    }

    throw exception;
  }
}
