import { Module } from '@nestjs/common';
import { createMailDriver } from './mail-driver.factory';
import { InviteMailer } from './invite-mailer';
import { PasswordResetMailer } from './password-reset-mailer';
import { MAIL_DRIVER_TOKEN } from './mail.types';

@Module({
  providers: [
    {
      provide: MAIL_DRIVER_TOKEN,
      useFactory: () => createMailDriver(process.env),
    },
    InviteMailer,
    PasswordResetMailer,
  ],
  exports: [InviteMailer, PasswordResetMailer],
})
export class MailModule {}
