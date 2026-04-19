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

export { ClassController } from './class/class.controller';
export { UserController } from './user/user.controller';
