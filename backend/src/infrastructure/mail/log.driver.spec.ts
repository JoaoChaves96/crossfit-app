import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { LogDriver } from './log.driver';
import { MailMessage } from './mail.types';

const MESSAGE: MailMessage = {
  to: 'dana@example.com',
  subject: 'You are invited to join Box One on BoxOps',
  html: '<p>hi</p>',
  text: 'hi',
};

describe('LogDriver', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mail-preview-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes the rendered HTML into the preview directory when one is configured', async () => {
    await new LogDriver('from@example.com', dir).send(MESSAGE);

    const files = readdirSync(dir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/\.html$/);
    expect(readFileSync(join(dir, files[0]), 'utf8')).toBe('<p>hi</p>');
  });

  it('writes nothing when no preview directory is configured', async () => {
    await new LogDriver('from@example.com', undefined).send(MESSAGE);

    expect(readdirSync(dir)).toHaveLength(0);
  });

  // It stands in for a provider that is not there; a failure it invented
  // would be a lie, and it would make `delivery: 'failed'` unreachable to
  // reproduce locally by accident.
  it('never throws, even when the preview directory cannot be written', async () => {
    await expect(
      new LogDriver('from@example.com', '/definitely/not/a/writable/path').send(MESSAGE),
    ).resolves.toBeUndefined();
  });
});
