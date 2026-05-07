/**
 * HTTP API Controllers
 *
 * This directory contains all NestJS controllers that handle HTTP requests.
 * Each controller:
 * - Extracts user context and validates input
 * - Maps HTTP request to a CQRS command
 * - Delegates to CommandBus for execution
 *
 * Controllers MUST be thin - no business logic, only transport.
 */

export { ClassSchedulingController } from './class/class-scheduling.controller';
export { ClassBookingController } from './class/class-booking.controller';
export { ClassProgrammingController } from './class/class-programming.controller';
export { ClassResultsController } from './class/class-results.controller';
export { UserController } from './user/user.controller';
