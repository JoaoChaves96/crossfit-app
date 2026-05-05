import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './config/database.module';
import { HttpModule } from './http/http.module';
import { AuthModule } from './api/auth/auth.module';

/**
 * AppModule: Root application module
 *
 * Wiring:
 * 1. DatabaseModule - Configures TypeORM and all entities
 * 2. HttpModule - Registers all HTTP controllers and imports feature modules
 * 3. AuthModule - Handles authentication (login, JWT issuance)
 *
 * This module brings together all layers:
 * - Database configuration and ORM
 * - HTTP transport (controllers)
 * - Command handlers (CQRS)
 * - Domain services and repositories
 */
@Module({
  imports: [
    ScheduleModule.forRoot(), // Enables @Cron decorators
    DatabaseModule, // TypeORM setup
    HttpModule, // Controllers + feature modules
    AuthModule, // Authentication
  ],
})
export class AppModule {}
