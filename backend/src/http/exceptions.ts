import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export function notFound(message: string): NotFoundException {
  return new NotFoundException(message);
}

export function forbidden(message: string): ForbiddenException {
  return new ForbiddenException(message);
}

export function invalidState(message: string): BadRequestException {
  return new BadRequestException(message);
}
