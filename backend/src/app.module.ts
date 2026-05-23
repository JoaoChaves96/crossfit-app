import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './config/database.module';
import { HttpModule } from './http/http.module';

/**
 * AppModule: Root application module
 *
 * Wiring:
 * 1. DatabaseModule - Configures TypeORM and all entities
 * 2. HttpModule - Registers all HTTP controllers and imports feature modules
 *
 * This module brings together all layers:
 * - Database configuration and ORM
 * - HTTP transport (controllers)
 * - Command handlers (CQRS)
 * - Domain services and repositories
 */
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    DatabaseModule, // TypeORM setup
    HttpModule, // Controllers + feature modules
  ],
})
export class AppModule {}
