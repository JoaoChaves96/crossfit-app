import { Logger } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'fs';
import { isAbsolute, join, resolve } from 'path';
import { MailDriver, MailMessage } from './mail.types';

/**
 * The non-sending driver. It replaces the old NOT EMAILED console line and
 * adds an openable artefact: with MAIL_PREVIEW_DIR set it drops the rendered
 * HTML on disk so a template can be eyeballed in a browser without deploying.
 *
 * It never throws. It is not a provider under test — it is the absence of one.
 */
export class LogDriver implements MailDriver {
  private readonly logger = new Logger(LogDriver.name);

  constructor(
    private readonly from: string,
    private readonly previewDir?: string,
  ) {}

  async send(message: MailMessage): Promise<void> {
    this.logger.log(
      `NOT SENT (log driver) — would mail "${message.subject}" from ${this.from} to ${message.to}`,
    );

    if (!this.previewDir) return;

    try {
      const dir = isAbsolute(this.previewDir)
        ? this.previewDir
        : resolve(process.cwd(), this.previewDir);
      mkdirSync(dir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const slug = message.to.replace(/[^a-zA-Z0-9]/g, '-');
      const file = join(dir, `${stamp}-${slug}.html`);
      writeFileSync(file, message.html, 'utf8');
      this.logger.log(`Preview written to ${file}`);
    } catch (err) {
      this.logger.warn(
        `Could not write a mail preview to ${this.previewDir}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
