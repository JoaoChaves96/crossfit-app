import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './database.config';

/**
 * DatabaseModule: Configures TypeORM and registers all domain entities
 *
 * This module is imported by AppModule to set up the database connection
 * and make entities available to all feature modules.
 */
@Module({
  imports: [TypeOrmModule.forRoot(databaseConfig)],
})
export class DatabaseModule {}
