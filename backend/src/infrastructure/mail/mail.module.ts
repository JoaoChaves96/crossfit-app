import { Module } from '@nestjs/common';
import { createMailDriver } from './mail-driver.factory';
import { InviteMailer } from './invite-mailer';
import { MAIL_DRIVER_TOKEN } from './mail.types';

@Module({
  providers: [
    {
      provide: MAIL_DRIVER_TOKEN,
      useFactory: () => createMailDriver(process.env),
    },
    InviteMailer,
  ],
  exports: [InviteMailer],
})
export class MailModule {}
