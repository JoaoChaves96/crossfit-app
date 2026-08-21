import { Module } from '@nestjs/common';
import { createMailDriver } from './mail-driver.factory';
import { MAIL_DRIVER_TOKEN } from './mail.types';

@Module({
  providers: [
    {
      provide: MAIL_DRIVER_TOKEN,
      useFactory: () => createMailDriver(process.env),
    },
  ],
  exports: [MAIL_DRIVER_TOKEN],
})
export class MailModule {}
