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
 * Defense-in-depth filter that maps a Postgres 22P02 error (invalid text
 * representation, typically a malformed UUID) to a clean 400 Bad Request,
 * so a raw DB error can never surface as a 500. Any other QueryFailedError
 * is re-thrown unchanged to preserve existing behavior.
 */
@Catch(QueryFailedError)
export class QueryFailedFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: QueryFailedError, host: ArgumentsHost): void {
    const code = (exception as unknown as { code?: string }).code;

    if (code !== PG_INVALID_TEXT_REPRESENTATION) {
      throw exception;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const body = {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Invalid identifier format',
      error: 'Bad Request',
    };

    const httpAdapter = this.httpAdapterHost.httpAdapter;
    httpAdapter.reply(response, body, HttpStatus.BAD_REQUEST);
  }
}
