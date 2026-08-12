import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './config/database.module';
import { HttpModule } from './http/http.module';
import { AuthModule } from './api/auth/auth.module';

/**
 * Registering ScheduleModule is what makes the three @Cron services tick
 * (class lifecycle, membership renewal, booking reminders). The e2e suite must
 * run without them: the lifecycle cron transitions classes out of `published`
 * every minute, which rewrites a fixture underneath a running test.
 *
 * Gating it here — at the single place it is imported — is what keeps
 * test-awareness out of the domain layer. No @Cron service injects
 * SchedulerRegistry, so with this omitted they are simply never explored: they
 * still construct and their methods stay callable and unit-testable.
 *
 * Off only when explicitly asked. Absent or any other value, schedulers run.
 */
const schedulersDisabled = process.env.DISABLE_SCHEDULERS === 'true';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ...(schedulersDisabled ? [] : [ScheduleModule.forRoot()]),
    DatabaseModule,
    HttpModule,
    AuthModule,
  ],
})
export class AppModule {}
