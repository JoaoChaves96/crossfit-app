# Email Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An invite created in the app arrives as an email at its recipient, so the gym owner stops being the mail carrier.

**Architecture:** A `MailDriver` interface with two implementations — `ResendDriver` (one `fetch` POST) and `LogDriver` (console + optional HTML file) — selected at boot by `MAIL_DRIVER`. Above it, `InviteMailer` owns the two role-specific templates. `InviteService.announceInviteLink` keeps its name and call site but returns `'sent' | 'failed'` instead of `void`, and never throws: the invite row is already persisted when it runs.

**Tech Stack:** NestJS 11, TypeORM, jest 30 (backend); Expo / React Native Web, @testing-library/react-native, Playwright (frontend). Resend's HTTP API via global `fetch` — **no new npm dependency in either project.**

**Spec:** `docs/superpowers/specs/2026-08-21-email-service-design.md`

## Global Constraints

Every task's requirements implicitly include these.

- **No new npm dependencies.** Not `resend`, not `nodemailer`, not `@react-email/*`. Resend is reached with global `fetch` (Node 22).
- **`announceInviteLink` must never throw.** The invite row is saved before it runs; raising would destroy a valid token over a delivery that failed. It converts exceptions into a status — that is its whole job.
- **`delivery` lives on the create responses only.** No entity column, no migration, no change to what the list endpoint stores.
- **Accent hex is exactly `#E23B4E`** and appears **exactly once** in the rendered email HTML (the Accept button). The One Accent Rule.
- **`Status.danger` (`#B3261E`) is never used for a delivery failure.** Failure copy uses `Ink.strong`, matching the existing `inlineError` pattern in both screens. The Two Reds Rule.
- **There is no success role.** A successful send is quiet meta text, never a green banner.
- **Email templates hardcode their hex values.** A backend file must not import `frontend/constants/design.ts`.
- **`MAIL_PREVIEW_DIR` is unset under jest and Playwright**, so no test run writes files into the working tree.
- **Every new frontend test suite pins the responsive register** (`mockIsMobile`), because jsdom defaults to 750px and an unpinned suite silently tests mobile only.
- **Swagger is the API contract.** Any DTO change updates its `@ApiProperty` decorators, and the frontend then re-runs `npm run generate:api-types` — never hand-edits `types/api.gen.ts`.
- **Default sender:** `BoxOps <invites@mail.boxops.dev>`.
- **Date formatting in emails pins `timeZone: 'UTC'`.** An unpinned format makes the expiry date depend on the server's clock zone.

## Human prerequisites (block Task 11 only)

Tasks 1–10 can all be built and tested without these.

1. Sign up for Resend; add `mail.boxops.dev` as a sending domain.
2. Add Resend's SPF + DKIM records to Cloudflare DNS, plus a DMARC TXT record on `_dmarc.boxops.dev`.
3. `flyctl secrets set RESEND_API_KEY=... MAIL_DRIVER=resend -a boxops-api-staging`.

`FRONTEND_URL` was verified already correct on staging (its secret digest is byte-identical to `CORS_ORIGINS`, which is `https://app.boxops.dev`). No action needed.

## File Structure

| File | Responsibility |
|---|---|
| `backend/src/infrastructure/mail/mail.types.ts` | `MailMessage`, `MailDriver`, `MailDeliveryError`, `MAIL_DRIVER_TOKEN`, `DEFAULT_MAIL_FROM` |
| `backend/src/infrastructure/mail/resend.driver.ts` | One POST to `api.resend.com/emails`; throws `MailDeliveryError` |
| `backend/src/infrastructure/mail/log.driver.ts` | Logs; writes HTML to `MAIL_PREVIEW_DIR` when set; never throws |
| `backend/src/infrastructure/mail/mail-driver.factory.ts` | `createMailDriver(env)` — pure, boot-time validated |
| `backend/src/infrastructure/mail/mail.module.ts` | Provides the driver + `InviteMailer` |
| `backend/src/infrastructure/mail/invite-mailer.ts` | `sendInviteEmail(input)` — composes and delegates |
| `backend/src/infrastructure/mail/templates/invite-email.ts` | `renderInviteEmail(input)` → `{ subject, html, text }` |
| `backend/src/domain/invite/invite-delivery.types.ts` | `InviteDeliveryStatus` |
| `backend/src/domain/invite/invite.service.ts` | `buildInviteLink`, inviter lookup, `announceInviteLink` returns a status |
| `backend/src/api/invite/dto/invite-response.dto.ts` | `+ delivery` |
| `backend/src/api/invite/dto/invite-list-item.dto.ts` | `+ inviteLink` |
| `backend/src/commands/gym-configuration/dto/invite-coach-response.dto.ts` | `+ delivery`; corrected description |
| `frontend/app/invites.tsx` | Both modal states; `Send Invite`; `Resend` |
| `frontend/app/coaches.tsx` | Both modal states; `inviteLinkFor` deleted |

---

### Task 1: Mail types and the Resend driver

**Files:**
- Create: `backend/src/infrastructure/mail/mail.types.ts`
- Create: `backend/src/infrastructure/mail/resend.driver.ts`
- Test: `backend/src/infrastructure/mail/resend.driver.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `MailMessage { to: string; subject: string; html: string; text: string; replyTo?: string }`; `MailDriver { send(message: MailMessage): Promise<void> }`; `class MailDeliveryError extends Error`; `const MAIL_DRIVER_TOKEN: symbol`; `const DEFAULT_MAIL_FROM: string`; `class ResendDriver implements MailDriver` with `constructor(apiKey: string, from: string)`.

- [x] **Step 1: Write the types**

`backend/src/infrastructure/mail/mail.types.ts`:

```ts
/**
 * The mail seam. A driver either delivers or throws — it never reports
 * failure by returning, because the only caller (announceInviteLink) turns
 * an exception into a status and must not have to inspect a result object.
 */
export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export interface MailDriver {
  send(message: MailMessage): Promise<void>;
}

export class MailDeliveryError extends Error {
  constructor(reason: string) {
    super(`Email delivery failed: ${reason}`);
    this.name = 'MailDeliveryError';
  }
}

export const MAIL_DRIVER_TOKEN = Symbol('MailDriver');

export const DEFAULT_MAIL_FROM = 'BoxOps <invites@mail.boxops.dev>';
```

- [x] **Step 2: Write the failing driver test**

`backend/src/infrastructure/mail/resend.driver.spec.ts`:

```ts
import { ResendDriver } from './resend.driver';
import { MailDeliveryError, MailMessage } from './mail.types';

const MESSAGE: MailMessage = {
  to: 'dana@example.com',
  subject: 'You are invited',
  html: '<p>hi</p>',
  text: 'hi',
  replyTo: 'owner@example.com',
};

describe('ResendDriver', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('posts the message to the Resend API and resolves on 200', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '{}' });

    await new ResendDriver('re_test_key', 'BoxOps <invites@mail.boxops.dev>').send(MESSAGE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer re_test_key');
    const body = JSON.parse(init.body as string);
    expect(body.from).toBe('BoxOps <invites@mail.boxops.dev>');
    expect(body.to).toEqual(['dana@example.com']);
    expect(body.subject).toBe('You are invited');
    expect(body.html).toBe('<p>hi</p>');
    expect(body.text).toBe('hi');
    // Resend's field is snake_case; sending replyTo would silently drop it.
    expect(body.reply_to).toBe('owner@example.com');
  });

  it('omits reply_to entirely when there is no reply address', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '{}' });

    await new ResendDriver('k', 'from@example.com').send({ ...MESSAGE, replyTo: undefined });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect('reply_to' in body).toBe(false);
  });

  it('throws MailDeliveryError carrying the status and the provider body on a non-2xx', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => '{"message":"API key is invalid"}' });

    await expect(new ResendDriver('bad', 'from@example.com').send(MESSAGE)).rejects.toThrow(
      MailDeliveryError,
    );
    await expect(new ResendDriver('bad', 'from@example.com').send(MESSAGE)).rejects.toThrow(
      /401.*API key is invalid/,
    );
  });

  it('throws MailDeliveryError when the request itself fails', async () => {
    fetchMock.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

    await expect(new ResendDriver('k', 'from@example.com').send(MESSAGE)).rejects.toThrow(
      /getaddrinfo ENOTFOUND/,
    );
  });
});
```

- [x] **Step 3: Run the test and verify it fails**

Run: `cd backend && npx jest src/infrastructure/mail/resend.driver.spec.ts`
Expected: FAIL — `Cannot find module './resend.driver'`.

- [x] **Step 4: Implement the driver**

`backend/src/infrastructure/mail/resend.driver.ts`:

```ts
import { MailDeliveryError, MailDriver, MailMessage } from './mail.types';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * Resend over plain fetch. No SDK: this is one POST, and owning the error
 * mapping ourselves is what lets announceInviteLink report a status instead
 * of guessing at a wrapper's exception types.
 */
export class ResendDriver implements MailDriver {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: MailMessage): Promise<void> {
    let response: Response;
    try {
      response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
      });
    } catch (err) {
      throw new MailDeliveryError(
        err instanceof Error ? err.message : 'the request to Resend failed',
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new MailDeliveryError(
        `Resend returned ${response.status}${body ? `: ${body}` : ''}`,
      );
    }
  }
}
```

- [x] **Step 5: Run the test and verify it passes**

Run: `cd backend && npx jest src/infrastructure/mail/resend.driver.spec.ts`
Expected: PASS, 4 tests.

- [x] **Step 6: Commit**

```bash
git add backend/src/infrastructure/mail/
git commit -m "feat(mail): add the mail driver seam and a Resend driver"
```

---

### Task 2: The log driver

**Files:**
- Create: `backend/src/infrastructure/mail/log.driver.ts`
- Test: `backend/src/infrastructure/mail/log.driver.spec.ts`
- Modify: `backend/.gitignore` (or the repo root `.gitignore` if `backend/.gitignore` does not exist — check first)

**Interfaces:**
- Consumes: `MailDriver`, `MailMessage` from Task 1.
- Produces: `class LogDriver implements MailDriver` with `constructor(from: string, previewDir?: string)`.

- [x] **Step 1: Write the failing test**

`backend/src/infrastructure/mail/log.driver.spec.ts`:

```ts
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
```

- [x] **Step 2: Run the test and verify it fails**

Run: `cd backend && npx jest src/infrastructure/mail/log.driver.spec.ts`
Expected: FAIL — `Cannot find module './log.driver'`.

- [x] **Step 3: Implement the driver**

`backend/src/infrastructure/mail/log.driver.ts`:

```ts
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
```

- [x] **Step 4: Run the test and verify it passes**

Run: `cd backend && npx jest src/infrastructure/mail/log.driver.spec.ts`
Expected: PASS, 3 tests.

- [x] **Step 5: Gitignore the preview directory**

Check which gitignore governs the backend: `ls backend/.gitignore`. Append to whichever exists (prefixing the path with `backend/` if you are editing the root file):

```gitignore
# Rendered email previews from the local mail log driver (MAIL_PREVIEW_DIR).
tmp/
```

- [x] **Step 6: Commit**

```bash
git add backend/src/infrastructure/mail/log.driver.ts backend/src/infrastructure/mail/log.driver.spec.ts backend/.gitignore
git commit -m "feat(mail): add the non-sending log driver with an HTML preview"
```

---

### Task 3: Driver selection, boot validation, and configuration

**Files:**
- Create: `backend/src/infrastructure/mail/mail-driver.factory.ts`
- Create: `backend/src/infrastructure/mail/mail.module.ts`
- Test: `backend/src/infrastructure/mail/mail-driver.factory.spec.ts`
- Modify: `backend/.env.example`

**Interfaces:**
- Consumes: `ResendDriver` (Task 1), `LogDriver` (Task 2), `MAIL_DRIVER_TOKEN`, `DEFAULT_MAIL_FROM`.
- Produces: `createMailDriver(env: NodeJS.ProcessEnv): MailDriver`; `class MailModule` exporting `InviteMailer` (the provider is added in Task 5 — this task's module exports only the driver token).

- [x] **Step 1: Write the failing factory test**

`backend/src/infrastructure/mail/mail-driver.factory.spec.ts`:

```ts
import { createMailDriver } from './mail-driver.factory';
import { LogDriver } from './log.driver';
import { ResendDriver } from './resend.driver';

describe('createMailDriver', () => {
  it('defaults to the log driver when MAIL_DRIVER is unset', () => {
    expect(createMailDriver({})).toBeInstanceOf(LogDriver);
  });

  it('builds a Resend driver when asked for one and a key is present', () => {
    expect(
      createMailDriver({ MAIL_DRIVER: 'resend', RESEND_API_KEY: 're_key' }),
    ).toBeInstanceOf(ResendDriver);
  });

  // Presence only, never validity: the forced-failure verification on staging
  // sets a real-looking but wrong key and needs the app to boot so Resend can
  // answer 401 at send time.
  it('refuses to build a Resend driver without a key', () => {
    expect(() => createMailDriver({ MAIL_DRIVER: 'resend' })).toThrow(/RESEND_API_KEY/);
  });

  it('rejects an unknown driver name rather than silently not sending', () => {
    expect(() => createMailDriver({ MAIL_DRIVER: 'sendgrid' })).toThrow(/sendgrid/);
  });
});
```

- [x] **Step 2: Run the test and verify it fails**

Run: `cd backend && npx jest src/infrastructure/mail/mail-driver.factory.spec.ts`
Expected: FAIL — `Cannot find module './mail-driver.factory'`.

- [x] **Step 3: Implement the factory**

`backend/src/infrastructure/mail/mail-driver.factory.ts`:

```ts
import { DEFAULT_MAIL_FROM, MailDriver } from './mail.types';
import { LogDriver } from './log.driver';
import { ResendDriver } from './resend.driver';

/**
 * Boot-time selection, so a misconfigured environment fails the deploy rather
 * than the first invite an owner creates. The key is checked for presence and
 * never for validity — see mail-driver.factory.spec.ts.
 */
export function createMailDriver(env: NodeJS.ProcessEnv): MailDriver {
  const from = env.MAIL_FROM || DEFAULT_MAIL_FROM;
  const name = env.MAIL_DRIVER || 'log';

  switch (name) {
    case 'log':
      return new LogDriver(from, env.MAIL_PREVIEW_DIR);
    case 'resend': {
      if (!env.RESEND_API_KEY) {
        throw new Error(
          'MAIL_DRIVER=resend requires RESEND_API_KEY. Refusing to start: a missing key ' +
            'would mean every invite silently failed to send.',
        );
      }
      return new ResendDriver(env.RESEND_API_KEY, from);
    }
    default:
      throw new Error(`Unknown MAIL_DRIVER "${name}". Valid values are "log" and "resend".`);
  }
}
```

- [x] **Step 4: Run the test and verify it passes**

Run: `cd backend && npx jest src/infrastructure/mail/mail-driver.factory.spec.ts`
Expected: PASS, 4 tests.

- [x] **Step 5: Add the module**

`backend/src/infrastructure/mail/mail.module.ts`:

```ts
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
```

- [x] **Step 6: Document the configuration**

Append to `backend/.env.example`, matching that file's existing commented style:

```dotenv
# --- Mail ------------------------------------------------------------------
# 'log' does not send: it logs the message and, when MAIL_PREVIEW_DIR is set,
# writes the rendered HTML there so you can open it in a browser. 'resend'
# delivers for real and requires RESEND_API_KEY — the app refuses to start
# without it rather than failing quietly on the first invite.
MAIL_DRIVER=log

# Where the log driver drops rendered previews. Unset means log only, which is
# what jest and the e2e suites want: no test run should write files here.
MAIL_PREVIEW_DIR=tmp/mail

# Envelope sender. Must be an address on a domain verified with the provider —
# mail.boxops.dev is the verified sending subdomain.
MAIL_FROM=BoxOps <invites@mail.boxops.dev>

# Provider API key. Deployed environments set this as a secret; never commit it.
# RESEND_API_KEY=re_...
```

- [x] **Step 7: Verify the whole mail directory compiles and passes**

Run: `cd backend && npx tsc --noEmit && npx jest src/infrastructure/mail`
Expected: no type errors; 11 tests pass.

- [x] **Step 8: Commit**

```bash
git add backend/src/infrastructure/mail/ backend/.env.example
git commit -m "feat(mail): select the driver at boot and document its configuration"
```

---

### Task 4: The invite email templates

**Files:**
- Create: `backend/src/infrastructure/mail/templates/invite-email.ts`
- Test: `backend/src/infrastructure/mail/templates/invite-email.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  interface InviteEmailInput {
    role: 'athlete' | 'coach';
    gymName: string;
    inviterName: string | null;
    inviteLink: string;
    expiresAt: Date;
  }
  function renderInviteEmail(input: InviteEmailInput): { subject: string; html: string; text: string }
  ```

- [x] **Step 1: Write the failing test**

`backend/src/infrastructure/mail/templates/invite-email.spec.ts`:

```ts
import { renderInviteEmail } from './invite-email';

const BASE = {
  gymName: 'Box One',
  inviterName: 'Olive Owner',
  inviteLink: 'https://app.boxops.dev/invite/tok-abc',
  expiresAt: new Date('2026-08-28T10:00:00.000Z'),
};

describe('renderInviteEmail', () => {
  it('names the gym, the inviter, the link and the expiry in both parts, for an athlete', () => {
    const { subject, html, text } = renderInviteEmail({ ...BASE, role: 'athlete' });

    expect(subject).toBe("You're invited to join Box One on BoxOps");
    for (const part of [html, text]) {
      expect(part).toContain('Box One');
      expect(part).toContain('Olive Owner');
      expect(part).toContain('https://app.boxops.dev/invite/tok-abc');
      expect(part).toContain('28 August 2026');
    }
    expect(text).toContain('book classes and log your results');
  });

  it('tells a coach they are being offered a job, not a membership', () => {
    const { subject, html, text } = renderInviteEmail({ ...BASE, role: 'coach' });

    expect(subject).toBe('Box One invited you to coach on BoxOps');
    expect(text).toContain('coaching staff');
    expect(html).toContain('mark attendance');
    expect(text).not.toContain('book classes and log your results');
  });

  // The expiry date must not depend on the server's clock zone: an unpinned
  // format would say "27 August" on a US host for the same instant.
  it('formats the expiry date in UTC regardless of the process timezone', () => {
    const { text } = renderInviteEmail({
      ...BASE,
      role: 'athlete',
      expiresAt: new Date('2026-08-28T01:00:00.000Z'),
    });

    expect(text).toContain('28 August 2026');
  });

  it('falls back to the gym alone when the inviter cannot be resolved', () => {
    const { html, text } = renderInviteEmail({ ...BASE, role: 'coach', inviterName: null });

    expect(text).toContain("You've been invited to coach at Box One");
    expect(html).not.toContain('null');
    expect(html).not.toContain('undefined');
  });

  // The One Accent Rule, enforced rather than trusted: the Accept button is
  // the single crimson element in the message.
  it('uses the accent exactly once and never the danger red', () => {
    const { html } = renderInviteEmail({ ...BASE, role: 'athlete' });

    expect(html.match(/#E23B4E/gi)).toHaveLength(1);
    expect(html).not.toContain('#B3261E');
  });

  it('escapes gym and inviter names so they cannot inject markup', () => {
    const { html } = renderInviteEmail({
      ...BASE,
      role: 'athlete',
      gymName: 'Box <script>alert(1)</script>',
      inviterName: 'A & B',
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B');
  });

  it('repeats the link as plain text in the HTML, for clients that strip buttons', () => {
    const { html } = renderInviteEmail({ ...BASE, role: 'athlete' });

    expect(html.match(/https:\/\/app\.boxops\.dev\/invite\/tok-abc/g)!.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [x] **Step 2: Run the test and verify it fails**

Run: `cd backend && npx jest src/infrastructure/mail/templates`
Expected: FAIL — `Cannot find module './invite-email'`.

- [x] **Step 3: Implement the template**

`backend/src/infrastructure/mail/templates/invite-email.ts`:

```ts
/**
 * The invite emails. Two wordings, one layout.
 *
 * Constraints that look like mistakes but are not:
 * - Table layout and inline styles. Email clients do not do flexbox.
 * - No @font-face, so the Named-Face Rule cannot apply literally; a system
 *   serif/sans stack is as close to Clean Ink as email gets.
 * - Hex values are hardcoded. A backend file importing the frontend's token
 *   module would be a new cross-boundary dependency for two colours.
 * - The accent appears exactly once (the Accept button). One Accent Rule.
 */

export interface InviteEmailInput {
  role: 'athlete' | 'coach';
  gymName: string;
  inviterName: string | null;
  inviteLink: string;
  expiresAt: Date;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const ACCENT = '#E23B4E';
const INK_STRONG = '#1A1A1A';
const INK_MUTED = '#5C5C5C';
const HAIRLINE = '#E5E2DD';
const PAPER = '#FBFAF8';

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatExpiry(expiresAt: Date): string {
  return expiresAt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function copyFor(input: InviteEmailInput): {
  subject: string;
  intro: string;
  detail: string;
} {
  const { role, gymName, inviterName } = input;

  if (role === 'coach') {
    return {
      subject: `${gymName} invited you to coach on BoxOps`,
      intro: inviterName
        ? `${inviterName} invited you to coach at ${gymName}.`
        : `You've been invited to coach at ${gymName}.`,
      detail:
        'Accepting adds you to their coaching staff — you will be able to see your assigned ' +
        'classes, mark attendance, and view results.',
    };
  }

  return {
    subject: `You're invited to join ${gymName} on BoxOps`,
    intro: inviterName
      ? `${inviterName} invited you to join ${gymName}.`
      : `You've been invited to join ${gymName}.`,
    detail: 'Accept your invite to book classes and log your results.',
  };
}

export function renderInviteEmail(input: InviteEmailInput): RenderedEmail {
  const { subject, intro, detail } = copyFor(input);
  const expiry = formatExpiry(input.expiresAt);
  const link = input.inviteLink;

  const text = [
    intro,
    '',
    detail,
    '',
    'Accept your invite:',
    link,
    '',
    `This link expires on ${expiry} — 7 days from when it was sent.`,
    '',
    'BoxOps',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${PAPER};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAPER};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#FFFFFF;border:1px solid ${HAIRLINE};">
        <tr>
          <td style="padding:24px 28px 8px 28px;font-family:${SANS};font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${INK_MUTED};">
            BoxOps
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px;">
            <div style="height:1px;background-color:${HAIRLINE};"></div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px 8px 28px;font-family:${SANS};font-size:18px;line-height:1.4;font-weight:600;color:${INK_STRONG};">
            ${escapeHtml(intro)}
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px 28px;font-family:${SANS};font-size:15px;line-height:1.55;color:${INK_MUTED};">
            ${escapeHtml(detail)}
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px 28px;">
            <a href="${escapeHtml(link)}" style="display:inline-block;background-color:${ACCENT};color:#FFFFFF;font-family:${SANS};font-size:15px;font-weight:600;text-decoration:none;padding:12px 22px;">
              Accept invite
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px 28px;font-family:${SANS};font-size:13px;line-height:1.5;color:${INK_MUTED};">
            Or paste this into your browser:<br />
            <span style="word-break:break-all;">${escapeHtml(link)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px;">
            <div style="height:1px;background-color:${HAIRLINE};"></div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 24px 28px;font-family:${SANS};font-size:12px;line-height:1.5;color:${INK_MUTED};">
            This link expires on ${escapeHtml(expiry)} — 7 days from when it was sent.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject, html, text };
}
```

- [x] **Step 4: Run the test and verify it passes**

Run: `cd backend && npx jest src/infrastructure/mail/templates`
Expected: PASS, 7 tests. If the accent-count test fails at 2, a hex was duplicated — the button is the only place it belongs.

- [x] **Step 5: Eyeball the rendered output once**

Run:

```bash
cd backend && npx ts-node -e "
const { renderInviteEmail } = require('./src/infrastructure/mail/templates/invite-email');
const fs = require('fs');
for (const role of ['athlete','coach']) {
  const out = renderInviteEmail({ role, gymName: 'Box One', inviterName: 'Olive Owner', inviteLink: 'https://app.boxops.dev/invite/tok-abc', expiresAt: new Date('2026-08-28T10:00:00Z') });
  fs.mkdirSync('tmp/mail', { recursive: true });
  fs.writeFileSync('tmp/mail/preview-' + role + '.html', out.html);
  console.log(out.subject);
}
"
open tmp/mail/preview-athlete.html tmp/mail/preview-coach.html
```

Expected: two subjects printed; both files open showing one crimson button, hairline rules, no boxed shadows.

- [x] **Step 6: Commit**

```bash
git add backend/src/infrastructure/mail/templates/
git commit -m "feat(mail): add the athlete and coach invite email templates"
```

---

### Task 5: InviteMailer

**Files:**
- Create: `backend/src/infrastructure/mail/invite-mailer.ts`
- Test: `backend/src/infrastructure/mail/invite-mailer.spec.ts`
- Modify: `backend/src/infrastructure/mail/mail.module.ts`

**Interfaces:**
- Consumes: `MailDriver`, `MAIL_DRIVER_TOKEN` (Task 1); `renderInviteEmail`, `InviteEmailInput` (Task 4).
- Produces:
  ```ts
  interface SendInviteEmailInput {
    role: 'athlete' | 'coach';
    inviteeEmail: string;
    gymName: string;
    inviterName: string | null;
    inviterEmail: string | null;
    inviteLink: string;
    expiresAt: Date;
  }
  class InviteMailer { sendInviteEmail(input: SendInviteEmailInput): Promise<void> }
  ```
  `MailModule` now exports `InviteMailer`.

- [x] **Step 1: Write the failing test**

`backend/src/infrastructure/mail/invite-mailer.spec.ts`:

```ts
import { InviteMailer } from './invite-mailer';
import { MailDriver, MailMessage } from './mail.types';

const INPUT = {
  role: 'athlete' as const,
  inviteeEmail: 'dana@example.com',
  gymName: 'Box One',
  inviterName: 'Olive Owner',
  inviterEmail: 'olive@example.com',
  inviteLink: 'https://app.boxops.dev/invite/tok-abc',
  expiresAt: new Date('2026-08-28T10:00:00.000Z'),
};

describe('InviteMailer', () => {
  let sent: MailMessage[];
  let driver: MailDriver;

  beforeEach(() => {
    sent = [];
    driver = {
      send: async (message) => {
        sent.push(message);
      },
    };
  });

  it('sends the rendered invite to the invitee, replying to the inviter', async () => {
    await new InviteMailer(driver).sendInviteEmail(INPUT);

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('dana@example.com');
    expect(sent[0].replyTo).toBe('olive@example.com');
    expect(sent[0].subject).toBe("You're invited to join Box One on BoxOps");
    expect(sent[0].html).toContain('https://app.boxops.dev/invite/tok-abc');
    expect(sent[0].text).toContain('Olive Owner');
  });

  it('omits the reply address when the inviter has no resolvable email', async () => {
    await new InviteMailer(driver).sendInviteEmail({
      ...INPUT,
      inviterName: null,
      inviterEmail: null,
    });

    expect(sent[0].replyTo).toBeUndefined();
  });

  it('propagates a driver failure so the caller can report it', async () => {
    const failing: MailDriver = {
      send: async () => {
        throw new Error('boom');
      },
    };

    await expect(new InviteMailer(failing).sendInviteEmail(INPUT)).rejects.toThrow('boom');
  });
});
```

- [x] **Step 2: Run the test and verify it fails**

Run: `cd backend && npx jest src/infrastructure/mail/invite-mailer.spec.ts`
Expected: FAIL — `Cannot find module './invite-mailer'`.

- [x] **Step 3: Implement InviteMailer**

`backend/src/infrastructure/mail/invite-mailer.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { MAIL_DRIVER_TOKEN, MailDriver } from './mail.types';
import { renderInviteEmail } from './templates/invite-email';

export interface SendInviteEmailInput {
  role: 'athlete' | 'coach';
  inviteeEmail: string;
  gymName: string;
  inviterName: string | null;
  inviterEmail: string | null;
  inviteLink: string;
  expiresAt: Date;
}

/**
 * The only mail-aware thing the invite domain sees. It throws on failure —
 * announceInviteLink is what turns that into a status, so the failure path
 * stays in one place.
 */
@Injectable()
export class InviteMailer {
  constructor(@Inject(MAIL_DRIVER_TOKEN) private readonly driver: MailDriver) {}

  async sendInviteEmail(input: SendInviteEmailInput): Promise<void> {
    const { subject, html, text } = renderInviteEmail({
      role: input.role,
      gymName: input.gymName,
      inviterName: input.inviterName,
      inviteLink: input.inviteLink,
      expiresAt: input.expiresAt,
    });

    await this.driver.send({
      to: input.inviteeEmail,
      subject,
      html,
      text,
      ...(input.inviterEmail ? { replyTo: input.inviterEmail } : {}),
    });
  }
}
```

- [x] **Step 4: Register it in the module**

Replace the body of `backend/src/infrastructure/mail/mail.module.ts`:

```ts
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
```

- [x] **Step 5: Run the whole mail suite**

Run: `cd backend && npx tsc --noEmit && npx jest src/infrastructure/mail`
Expected: PASS, 14 tests.

- [x] **Step 6: Commit**

```bash
git add backend/src/infrastructure/mail/
git commit -m "feat(mail): add InviteMailer over the driver seam"
```

---

### Task 6: One source of truth for the invite link

**Files:**
- Modify: `backend/src/domain/invite/invite.service.ts` (extract the link builder; use it in `listInvites`)
- Modify: `backend/src/api/invite/dto/invite-list-item.dto.ts` (add `inviteLink`)
- Test: `backend/src/domain/invite/invite.service.spec.ts` (extend the existing `FRONTEND_URL` describe)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `private buildInviteLink(inviteToken: string): string` on `InviteService`; `InviteListItemDto.inviteLink: string`.

- [x] **Step 1: Write the failing test**

Add inside the existing `describe('FRONTEND_URL', ...)` block in `backend/src/domain/invite/invite.service.spec.ts`:

```ts
    it('gives list items the same link the create response built', async () => {
      process.env.FRONTEND_URL = 'https://app.boxops.dev';
      inviteRepo.find.mockResolvedValue([
        {
          id: 'inv-1',
          inviteeEmail: EMAIL,
          inviteToken: 'tok-abc',
          role: 'coach',
          status: 'pending',
          createdAt: new Date('2026-08-14T10:00:00.000Z'),
          expiresAt: new Date('2026-08-21T10:00:00.000Z'),
          acceptedAt: null,
        },
      ]);

      const [item] = await service.listInvites(GYM_ID, 'coach');

      expect(item.inviteLink).toBe('https://app.boxops.dev/invite/tok-abc');
    });
```

- [x] **Step 2: Run the test and verify it fails**

Run: `cd backend && npx jest src/domain/invite/invite.service.spec.ts -t "same link the create response"`
Expected: FAIL — `inviteLink` is `undefined`.

- [x] **Step 3: Add the field to the DTO**

In `backend/src/api/invite/dto/invite-list-item.dto.ts`, after the `inviteToken` property:

```ts
  @ApiProperty({
    description:
      'Full acceptance URL, built by the API from FRONTEND_URL. The only place an invite link ' +
      'is composed — clients must not rebuild it from their own origin, or the link in the ' +
      'invite email and the one behind Copy link could name different hosts.',
    example: 'https://app.boxops.dev/invite/abc123xyz',
  })
  inviteLink!: string;
```

- [x] **Step 4: Extract the builder and use it in both places**

In `backend/src/domain/invite/invite.service.ts`, replace these lines inside `createInvite`:

```ts
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
    const inviteLink = `${frontendUrl}/invite/${inviteToken}`;
```

with:

```ts
    const inviteLink = this.buildInviteLink(inviteToken);
```

Add the private method next to `announceInviteLink`, carrying the existing comment forward:

```ts
  /**
   * The single place an invite link is composed. `createInvite`, `listInvites`
   * and the invite email all call this, so the email and the Copy-link button
   * cannot disagree about the origin.
   *
   * The fallback is localhost, not a plausible-looking domain. The previous
   * default was `https://app.crossfitbox.com`, which nobody here owns: a
   * missing FRONTEND_URL minted links that looked correct and went nowhere,
   * silently. A localhost link is obviously wrong to whoever sees it, and
   * every deployed environment sets the variable.
   */
  private buildInviteLink(inviteToken: string): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
    return `${frontendUrl}/invite/${inviteToken}`;
  }
```

In `listInvites`, add to the mapped object after `inviteToken`:

```ts
      inviteLink: this.buildInviteLink(invite.inviteToken),
```

- [x] **Step 5: Run the invite suite and verify it passes**

Run: `cd backend && npx jest src/domain/invite`
Expected: PASS — the new test plus the existing 12.

- [x] **Step 6: Assert it in the integration suite**

In `backend/test/invite-coach.e2e-spec.ts`, find the assertion block for the invite-list response and add alongside the existing token check:

```ts
    expect(listed.inviteLink).toContain(`/invite/${listed.inviteToken}`);
```

Run: `cd backend && npm run test:e2e -- invite-coach`
Expected: PASS. (This suite owns `crossfit_box_e2e` — never point it at the dev database.)

- [x] **Step 7: Commit**

```bash
git add backend/src/domain/invite/invite.service.ts backend/src/domain/invite/invite.service.spec.ts backend/src/api/invite/dto/invite-list-item.dto.ts backend/test/invite-coach.e2e-spec.ts
git commit -m "feat(invite): make the API the only place an invite link is composed"
```

---

### Task 7: InviteService sends the invite and reports delivery

**Files:**
- Create: `backend/src/domain/invite/invite-delivery.types.ts`
- Modify: `backend/src/domain/invite/invite.service.ts` (inject `InviteMailer`, look up the inviter, `announceInviteLink` returns a status)
- Modify: `backend/src/api/invite/invite.module.ts` (import `MailModule`)
- Modify: `backend/src/api/invite/dto/invite-response.dto.ts` (add `delivery`)
- Modify: `backend/src/commands/gym-configuration/dto/invite-coach-response.dto.ts` (add `delivery`; correct the `inviteLink` description)
- Modify: `backend/src/commands/gym-configuration/handlers/invite-coach.handler.ts` (pass `delivery` through)
- Modify: `backend/src/api/invite/invite.controller.ts:83` (Swagger operation description)
- Test: `backend/src/domain/invite/invite.service.spec.ts`

**Interfaces:**
- Consumes: `InviteMailer`, `SendInviteEmailInput` (Task 5); `buildInviteLink` (Task 6).
- Produces: `type InviteDeliveryStatus = 'sent' | 'failed'`; `InviteResponseDto.delivery` and `InviteCoachResponseDto.delivery`, both `InviteDeliveryStatus`.

**Note for the implementer:** coach invites do **not** go through the generic invite controller. They run through a CQRS handler (`InviteCoachHandler`) with its own response DTO. Both response shapes need the field or the coach modal cannot tell whether anything was sent.

- [x] **Step 1: Write the failing tests**

Add to `backend/src/domain/invite/invite.service.spec.ts`. First extend the module setup in the **first** `describe` block (`InviteService — coach invites`) — add a mailer double next to the other providers:

```ts
  let sendInviteEmail: jest.Mock;
```

in `beforeEach`, before `Test.createTestingModule`:

```ts
    sendInviteEmail = jest.fn().mockResolvedValue(undefined);
```

and in the `providers` array:

```ts
        { provide: InviteMailer, useValue: { sendInviteEmail } },
```

with the import at the top of the file:

```ts
import { InviteMailer } from '../../infrastructure/mail/invite-mailer';
```

Then add a new describe block at the end of that first `describe`:

```ts
  describe('delivery', () => {
    it('reports sent, and mails the invitee with the gym, role and link', async () => {
      userFindOne.mockResolvedValue({ id: OWNER_ID, name: 'Olive Owner', email: 'olive@example.com' });

      const result = await service.createInvite(GYM_ID, OWNER_ID, 'athlete@example.com');

      expect(result.delivery).toBe('sent');
      expect(sendInviteEmail).toHaveBeenCalledTimes(1);
      const input = sendInviteEmail.mock.calls[0][0];
      expect(input.inviteeEmail).toBe('athlete@example.com');
      expect(input.gymName).toBe('Box One');
      expect(input.role).toBe('athlete');
      expect(input.inviterName).toBe('Olive Owner');
      expect(input.inviterEmail).toBe('olive@example.com');
      expect(input.inviteLink).toBe(result.inviteLink);
      expect(input.expiresAt).toBeInstanceOf(Date);
    });

    // The row is saved before delivery is attempted. A send failure that
    // destroyed the invite would cost the owner a valid token over something
    // they can still work around by copying the link.
    it('reports failed but keeps the invite and returns its token', async () => {
      sendInviteEmail.mockRejectedValue(new Error('Resend returned 401'));

      const result = await service.createInvite(GYM_ID, OWNER_ID, 'athlete@example.com');

      expect(result.delivery).toBe('failed');
      expect(result.inviteToken).toHaveLength(43);
      expect(result.inviteLink).toContain(`/invite/${result.inviteToken}`);
      expect(inviteRepo.save).toHaveBeenCalledTimes(1);
    });

    it('still sends when the inviting user cannot be found', async () => {
      userFindOne.mockResolvedValue(null);

      const result = await service.createInvite(GYM_ID, OWNER_ID, 'athlete@example.com');

      expect(result.delivery).toBe('sent');
      expect(sendInviteEmail.mock.calls[0][0].inviterName).toBeNull();
      expect(sendInviteEmail.mock.calls[0][0].inviterEmail).toBeNull();
    });

    it('sends the coach wording for a coach invite', async () => {
      await service.createInvite(GYM_ID, OWNER_ID, EMAIL, 'coach');

      expect(sendInviteEmail.mock.calls[0][0].role).toBe('coach');
    });
  });
```

The second and third `describe` blocks in this file construct `InviteService` too. Add the same `InviteMailer` provider to each of them, or their `compile()` will fail on an unresolved dependency.

- [x] **Step 2: Run the tests and verify they fail**

Run: `cd backend && npx jest src/domain/invite/invite.service.spec.ts`
Expected: FAIL — Nest cannot resolve `InviteMailer` / `result.delivery` is `undefined`.

- [x] **Step 3: Add the status type**

`backend/src/domain/invite/invite-delivery.types.ts`:

```ts
/**
 * Whether the invite email went out. Deliberately not persisted: it describes
 * one request, and after that request an invite is just an invite. Adding a
 * column would imply a history the system does not keep.
 */
export type InviteDeliveryStatus = 'sent' | 'failed';
```

- [x] **Step 4: Wire the mailer into the service**

In `backend/src/domain/invite/invite.service.ts`:

Add imports:

```ts
import { Logger } from '@nestjs/common';
import { InviteMailer } from '../../infrastructure/mail/invite-mailer';
import { InviteDeliveryStatus } from './invite-delivery.types';
```

Add to the constructor parameter list:

```ts
    private readonly inviteMailer: InviteMailer,
```

Add a logger field on the class:

```ts
  private readonly logger = new Logger(InviteService.name);
```

In `createInvite`, replace:

```ts
    await this.announceInviteLink(inviteeEmail, gym.name, inviteLink);

    return {
      inviteToken,
      inviteLink,
      expiresAt: expiresAt.toISOString(),
      inviteeEmail,
      role,
    };
```

with:

```ts
    const inviter = await this.dataSource
      .getRepository(UserEntity)
      .findOne({ where: { id: createdByUserId } });

    const delivery = await this.announceInviteLink({
      inviteeEmail,
      gymName: gym.name,
      inviteLink,
      role,
      expiresAt,
      inviterName: inviter?.name ?? null,
      inviterEmail: inviter?.email ?? null,
    });

    return {
      inviteToken,
      inviteLink,
      expiresAt: expiresAt.toISOString(),
      inviteeEmail,
      role,
      delivery,
    };
```

Replace the whole `announceInviteLink` method with:

```ts
  /**
   * Delivery. Kept at this name and call site so the seam did not move when a
   * provider arrived.
   *
   * It MUST NOT throw. The invite row is already persisted by the time it
   * runs, so raising would destroy a valid token over a delivery failure the
   * owner can work around by copying the link. Converting the exception into a
   * status is the entire job.
   */
  private async announceInviteLink(input: {
    inviteeEmail: string;
    gymName: string;
    inviteLink: string;
    role: InviteRole;
    expiresAt: Date;
    inviterName: string | null;
    inviterEmail: string | null;
  }): Promise<InviteDeliveryStatus> {
    try {
      await this.inviteMailer.sendInviteEmail({
        role: input.role,
        inviteeEmail: input.inviteeEmail,
        gymName: input.gymName,
        inviterName: input.inviterName,
        inviterEmail: input.inviterEmail,
        inviteLink: input.inviteLink,
        expiresAt: input.expiresAt,
      });
      return 'sent';
    } catch (err) {
      this.logger.warn(
        `Invite for ${input.inviteeEmail} to ${input.gymName} was created but NOT delivered: ` +
          `${err instanceof Error ? err.message : String(err)}. ` +
          `The invite is valid; the link is ${input.inviteLink}`,
      );
      return 'failed';
    }
  }
```

- [x] **Step 5: Import MailModule where InviteService is provided**

In `backend/src/api/invite/invite.module.ts`, add to `imports`:

```ts
    MailModule,
```

with `import { MailModule } from '../../infrastructure/mail/mail.module';` at the top.

- [x] **Step 6: Add `delivery` to both response DTOs**

In `backend/src/api/invite/dto/invite-response.dto.ts`, after `role`:

```ts
  @ApiProperty({
    description:
      'Whether the invite email was delivered. "failed" means the invite is still valid and its ' +
      'token still usable — the caller must pass the link on by hand.',
    enum: ['sent', 'failed'],
    example: 'sent',
  })
  delivery: InviteDeliveryStatus;
```

with `import type { InviteDeliveryStatus } from '../../../domain/invite/invite-delivery.types';`.

In `backend/src/commands/gym-configuration/dto/invite-coach-response.dto.ts`, add the identical property, and replace the now-false `inviteLink` description:

```ts
  @ApiProperty({
    description:
      'Full acceptance URL. Also emailed to the invitee; kept in the response so the owner can ' +
      'pass it on themselves, which is the fallback when delivery is "failed".',
    example: 'https://app.boxops.dev/invite/AbC123...',
  })
  inviteLink: string;
```

- [x] **Step 7: Pass it through the coach handler**

In `backend/src/commands/gym-configuration/handlers/invite-coach.handler.ts`, add to the returned object:

```ts
        delivery: invite.delivery,
```

- [x] **Step 8: Correct the Swagger operation description**

In `backend/src/api/invite/invite.controller.ts`, replace the response description at line ~83 (currently `'Invite created. No email is delivered — there is no mail provider wired (see epics/EMAIL_SERVICE_EPIC.md), so the caller is responsible for getting ...'`) with:

```ts
      'Invite created and emailed to the invitee. Check `delivery`: "sent" means the email went ' +
      'out, "failed" means the invite is still valid but nothing was delivered and the link must ' +
      'be passed on by hand.',
```

- [x] **Step 9: Run the backend suites**

Run: `cd backend && npx tsc --noEmit && npx jest`
Expected: all green. Any suite that builds `InviteService` through `Test.createTestingModule` needs the `InviteMailer` provider added — that is the expected class of failure here, not a bug in the design.

- [x] **Step 10: Assert delivery in the integration suites**

In `backend/test/invite-lifecycle-and-profile.e2e-spec.ts` and `backend/test/invite-coach.e2e-spec.ts`, add to the create-invite assertions:

```ts
    expect(['sent', 'failed']).toContain(body.delivery);
```

Run: `cd backend && npm run test:e2e -- invite`
Expected: PASS. `MAIL_DRIVER` is unset in the e2e environment, so the log driver runs and `delivery` is `'sent'` without anything leaving the machine.

- [x] **Step 11: Commit**

```bash
git add backend/src/
git add backend/test/
git commit -m "feat(invite): email the invite and report delivery on the create response"
```

---

### Task 8: Coaches screen — real delivery, one link source

**Files:**
- Modify: `frontend/types/api.gen.ts` (regenerated, never hand-edited)
- Modify: `frontend/app/coaches.tsx` (delete `inviteLinkFor`; both modal states; label)
- Test: `frontend/__tests__/coaches.test.tsx`

**Interfaces:**
- Consumes: `InviteListItemDto.inviteLink` (Task 6); `InviteCoachResponseDto.delivery` (Task 7).
- Produces: nothing for later tasks.

- [x] **Step 1: Regenerate the API types**

The backend must be running and must be what is actually on port 3000 — **Grafana also listens on 3000 on this machine**, and generating against it would silently produce garbage.

```bash
cd backend && npm run start:dev   # in one terminal
curl -s localhost:3000/api-docs-json | head -c 60   # must begin with {"openapi"
cd frontend && npm run generate:api-types
git diff --stat frontend/types/api.gen.ts
```

Expected: the diff shows `delivery` on `InviteResponseDto` and `InviteCoachResponseDto`, and `inviteLink` on `InviteListItemDto`.

- [x] **Step 2: Write the failing tests**

In `frontend/__tests__/coaches.test.tsx`, add `inviteLink` to the `pendingInvite` fixture — without it the copy test would assert against `undefined`:

```ts
const pendingInvite = {
  id: 'inv-1',
  inviteeEmail: 'dana@example.com',
  inviteToken: 'tok-abc',
  inviteLink: 'https://app.boxops.dev/invite/tok-abc',
  role: 'coach',
  status: 'pending',
  createdAt: '2026-08-13T10:00:00.000Z',
  expiresAt: '2026-08-20T10:00:00.000Z',
  acceptedAt: null,
};
```

Tighten the existing copy test so it proves the link came from the API rather than from the test's own origin:

```ts
    expect(mockSetString).toHaveBeenCalledWith('https://app.boxops.dev/invite/tok-abc');
```

Replace the test titled `'shows the generated link after sending an invite, instead of claiming success'` with these two:

```ts
  it('confirms the email went out, and still offers the link', async () => {
    mockGet.mockResolvedValue({ coaches: [] });
    mockPost.mockResolvedValue({
      inviteToken: 'tok-new',
      inviteLink: 'https://app.boxops.dev/invite/tok-new',
      expiresAt: '2026-08-20T10:00:00.000Z',
      inviteeEmail: 'new@example.com',
      role: 'coach',
      delivery: 'sent',
    });

    render(<CoachesScreen />);
    fireEvent.press(screen.getByTestId('invite-coach-btn'));
    fireEvent.changeText(screen.getByTestId('invite-coach-email-input'), 'new@example.com');
    fireEvent.press(screen.getByTestId('modal-confirm-btn'));

    await waitFor(() => expect(screen.getByTestId('coach-invite-link-text')).toBeTruthy());
    expect(screen.getByText('Invite emailed to new@example.com.')).toBeTruthy();
    expect(screen.getByText('https://app.boxops.dev/invite/tok-new')).toBeTruthy();
  });

  it('says delivery failed but keeps the invite usable', async () => {
    mockGet.mockResolvedValue({ coaches: [] });
    mockPost.mockResolvedValue({
      inviteToken: 'tok-new',
      inviteLink: 'https://app.boxops.dev/invite/tok-new',
      expiresAt: '2026-08-20T10:00:00.000Z',
      inviteeEmail: 'new@example.com',
      role: 'coach',
      delivery: 'failed',
    });

    render(<CoachesScreen />);
    fireEvent.press(screen.getByTestId('invite-coach-btn'));
    fireEvent.changeText(screen.getByTestId('invite-coach-email-input'), 'new@example.com');
    fireEvent.press(screen.getByTestId('modal-confirm-btn'));

    await waitFor(() => expect(screen.getByTestId('coach-invite-link-text')).toBeTruthy());
    expect(
      screen.getByText("We couldn't email this invite. It's still valid — send them the link yourself."),
    ).toBeTruthy();
    expect(screen.getByText('https://app.boxops.dev/invite/tok-new')).toBeTruthy();
  });
```

- [x] **Step 3: Run the tests and verify they fail**

Run: `cd frontend && npx jest __tests__/coaches.test.tsx`
Expected: FAIL — the old "email delivery is not set up yet" copy is still rendered; `setString` receives a `window.location`-derived link.

- [x] **Step 4: Delete the client-side link builder**

In `frontend/app/coaches.tsx`, delete the whole `inviteLinkFor` function (lines ~38–47) and change its two callers to read the DTO field:

```ts
  function handleCopyInviteLink(invite: CoachInvite) {
    Clipboard.setString(invite.inviteLink);
    setCopiedToken(invite.inviteToken);
    setTimeout(() => setCopiedToken(null), 2000);
  }
```

Check for any other reference: `grep -n "inviteLinkFor" frontend/app/coaches.tsx` must return nothing.

- [x] **Step 5: Render both delivery states**

In the created-invite box in `coaches.tsx` (around line 439), replace the single line of copy:

```tsx
          {created !== null ? (
            <View style={styles.linkBox}>
              {/*
                Quiet meta text, never a green banner: DESIGN.md has no success
                role. And a delivery failure uses strong ink, not Status.danger
                — danger is destructive-only (Two Reds Rule), and this is
                information the owner can act on.
              */}
              {created.delivery === 'sent' ? (
                <Text size="meta" tone="muted">
                  {`Invite emailed to ${created.inviteeEmail}.`}
                </Text>
              ) : (
                <Text size="meta" weight="semibold" tone="strong">
                  We couldn&apos;t email this invite. It&apos;s still valid — send them the link yourself.
                </Text>
              )}
              <View style={styles.linkRow}>
                <Text testID="coach-invite-link-text" size="meta" numberOfLines={1} style={styles.linkText}>
                  {created.inviteLink}
                </Text>
                <TouchableOpacity onPress={() => handleCopyCreatedLink(created)} activeOpacity={0.7}>
                  <Text size="meta" weight="semibold">{copyLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
```

- [x] **Step 6: Rename the primary action**

In the same modal's footer, change the label — a send now happens, so `Create Link` understates it:

```tsx
                label={created !== null ? 'Done' : 'Send Invite'}
```

- [x] **Step 7: Run the tests and verify they pass**

Run: `cd frontend && npx tsc --noEmit && npx jest __tests__/coaches.test.tsx`
Expected: PASS, 7 tests.

- [x] **Step 8: Commit**

```bash
git add frontend/types/api.gen.ts frontend/app/coaches.tsx frontend/__tests__/coaches.test.tsx
git commit -m "feat(frontend): coach invites report delivery and use the API's link"
```

---

### Task 9: Invites screen — real delivery

**Files:**
- Modify: `frontend/app/invites.tsx`
- Test: `frontend/__tests__/invites.test.tsx` (new)

**Interfaces:**
- Consumes: `InviteResponseDto.delivery` (Task 7).
- Produces: nothing for later tasks.

**Note for the implementer:** this screen keeps its invite list in local component state and never fetches one, so Task 6's `inviteLink` on the list DTO is irrelevant here — `LocalInvite.inviteLink` already comes from the create response. Do not add a list fetch; that is out of scope.

- [x] **Step 1: Write the failing test suite**

Create `frontend/__tests__/invites.test.tsx`:

```tsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

// jsdom is 750px wide, so an unpinned suite would silently test the mobile
// register only. Pin it explicitly.
let mockIsMobile = false;

jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({
    isMobile: mockIsMobile,
    isDesktop: !mockIsMobile,
    width: mockIsMobile ? 390 : 1280,
  }),
}));

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/utils/api-client', () => ({
  createApiClient: () => ({ get: mockGet, post: mockPost, delete: mockDelete }),
}));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ token: 'test-token', user: { id: 'u1', role: 'owner' } }),
}));
jest.mock('@/hooks/useGym', () => ({ useGym: () => ({ currentGymId: 'gym-1' }) }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const mockSetString = jest.fn();
jest.mock('react-native/Libraries/Components/Clipboard/Clipboard', () => ({
  default: { setString: (v: string) => mockSetString(v) },
}));

import InvitesScreen from '@/app/invites';

const CREATED = {
  inviteToken: 'tok-new',
  inviteLink: 'https://app.boxops.dev/invite/tok-new',
  expiresAt: '2026-08-28T10:00:00.000Z',
  inviteeEmail: 'dana@example.com',
  role: 'athlete',
};

async function createInvite(delivery: 'sent' | 'failed') {
  mockPost.mockResolvedValue({ ...CREATED, delivery });

  render(<InvitesScreen />);
  fireEvent.press(screen.getByText('Invite an Athlete'));
  fireEvent.changeText(screen.getByTestId('invite-email-input'), 'dana@example.com');
  fireEvent.press(screen.getByTestId('invite-send-btn'));

  await waitFor(() => expect(screen.getByTestId('invite-link-text')).toBeTruthy());
}

describe('InvitesScreen — delivery', () => {
  beforeEach(() => {
    mockIsMobile = false;
    [mockGet, mockPost, mockDelete, mockSetString].forEach((fn) => fn.mockReset());
  });

  it('confirms the email went out and still offers the link', async () => {
    await createInvite('sent');

    expect(screen.getByText('Invite emailed to dana@example.com.')).toBeTruthy();
    expect(screen.getByText('Or send them the link yourself; it expires in 7 days.')).toBeTruthy();
    expect(screen.getByText('https://app.boxops.dev/invite/tok-new')).toBeTruthy();
  });

  it('says delivery failed without losing the invite', async () => {
    await createInvite('failed');

    expect(
      screen.getByText("We couldn't email this invite. It's still valid — send them the link yourself."),
    ).toBeTruthy();
    expect(screen.getByText('https://app.boxops.dev/invite/tok-new')).toBeTruthy();
  });

  it('no longer claims that nothing is delivered', async () => {
    render(<InvitesScreen />);

    expect(screen.queryByText(/No email goes out/)).toBeNull();
    expect(screen.queryByText(/Nothing is delivered automatically/)).toBeNull();
  });

  it('labels the row action Resend, because a send now happens', async () => {
    await createInvite('sent');
    fireEvent.press(screen.getByText('Cancel'));

    await waitFor(() => expect(screen.getByText('Resend')).toBeTruthy());
    expect(screen.queryByText('New link')).toBeNull();
  });

  it('operates on the mobile register too', async () => {
    mockIsMobile = true;
    await createInvite('sent');

    expect(screen.getByText('Invite emailed to dana@example.com.')).toBeTruthy();
  });
});
```

- [x] **Step 2: Run the suite and verify it fails**

Run: `cd frontend && npx jest __tests__/invites.test.tsx`
Expected: FAIL — the "Invite created — not sent" copy is still rendered and the row action still reads `New link`.

- [x] **Step 3: Carry `delivery` into the modal's state**

In `frontend/app/invites.tsx`, `createdInvite` is already typed `InviteResponse | null`, so `createdInvite.delivery` is available once the types are regenerated. No state change is needed — verify with `grep -n "InviteResponse | null" app/invites.tsx`.

- [x] **Step 4: Replace the success box copy**

Replace the `{/* Success state */}` block's two `Text` elements (currently `Invite created — not sent` and the `No email goes out...` paragraph) with:

```tsx
                {/*
                  Quiet meta text, never a green banner: DESIGN.md has no
                  success role. A failure uses strong ink rather than
                  Status.danger — danger is destructive-only (Two Reds Rule).
                */}
                {createdInvite.delivery === 'sent' ? (
                  <>
                    <Text size="meta" tone="muted">
                      {`Invite emailed to ${createdInvite.inviteeEmail}.`}
                    </Text>
                    <Text size="meta" tone="muted">
                      Or send them the link yourself; it expires in 7 days.
                    </Text>
                  </>
                ) : (
                  <Text size="meta" weight="semibold" tone="strong">
                    We couldn&apos;t email this invite. It&apos;s still valid — send them the link yourself.
                  </Text>
                )}
```

- [x] **Step 5: Rename the primary action and the row action**

The modal's primary button (`testID="invite-send-btn"`):

```tsx
                  label="Send Invite"
```

`InviteRow`'s action at line ~118 — replace the comment and the label together:

```tsx
              {/* Mints a fresh link and emails it, which is what makes "Resend" honest. */}
              <Text size="meta" weight="medium" tone="muted">Resend</Text>
```

- [x] **Step 6: Rewrite the empty state**

Replace the empty-state description at line ~425:

```tsx
      <Text size="body" tone="muted" style={styles.emptyDesc}>
        {'Invite an athlete by email. They get a link that expires in 7 days — and you can always copy it and send it yourself.'}
      </Text>
```

- [x] **Step 7: Run the suite and verify it passes**

Run: `cd frontend && npx tsc --noEmit && npx jest __tests__/invites.test.tsx`
Expected: PASS, 5 tests.

- [x] **Step 8: Run the full frontend suite and the invite journey**

Run:

```bash
cd frontend && npx jest
npx playwright test e2e/journeys/11-invites-bring-people-in.spec.ts
```

Expected: both green. The journey drives the modal by `testID` (`modal-confirm-btn`), not by label, so the renames do not break it — but confirm rather than assume, and make sure `MAIL_DRIVER` is unset for the API the journey runs against so no e2e run mails a real address.

- [x] **Step 9: Commit**

```bash
git add frontend/app/invites.tsx frontend/__tests__/invites.test.tsx
git commit -m "feat(frontend): athlete invites are emailed, with a failure fallback"
```

---

### Task 10: Documentation synchronization

**Files:**
- Modify: `epics/EMAIL_SERVICE_EPIC.md`
- Modify: `context/PROJECT_STATE.md`
- Modify: `context/DECISION_LOG.md`
- Modify: `docs/COMMAND_MODEL.md:1257`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing.

- [x] **Step 1: Turn the epic from a brief into a record**

Rewrite `epics/EMAIL_SERVICE_EPIC.md`. Its §1 ("There is no email provider, anywhere") and §2 ("Owner-copies-the-link is the deliberate interim mechanism) describe a state that no longer holds — recast them as history with a dated heading, keep §3's cost analysis, and replace §4/§5 with what shipped: Resend over `mail.boxops.dev`, the two-driver seam, `delivery` on the create responses, no retries and no send log, and the copy affordances deliberately retained.

- [x] **Step 2: Update the project state**

In `context/PROJECT_STATE.md`, replace the line reading `epics/EMAIL_SERVICE_EPIC.md (provider settled as Resend) is downstream of this domain and DNS work...` with the completed state: Resend live on staging from `mail.boxops.dev`, SPF/DKIM/DMARC passing, both invite roles delivering, and password reset noted as still unbuilt but now unblocked.

- [x] **Step 3: Record the two decisions**

Append to `context/DECISION_LOG.md`, following that file's existing heading + Decision + Rationale shape:

- **Resend Is The Email Provider (2026-08-21)** — chosen over SES because the app is not on AWS; free at this volume; lighter domain verification than SES's sandbox request.
- **Invite Delivery Reports Status Synchronously, With No Send Log (2026-08-21)** — the failures at this volume are permanent, not transient; a human is always on screen; the copy-link fallback already exists; and a retry sweep would inherit the duplicate-cron problem from staging's two Fly machines. Both a log and retries are additive later.

- [x] **Step 4: Make the command model true**

`docs/COMMAND_MODEL.md:1257` currently reads "Send invitation email (implementation-specific; may be async)". It is now specific and synchronous — say so: the invite email is sent inline during `createInvite`, and a failure is reported as `delivery: 'failed'` without rolling back the invite.

- [x] **Step 5: Verify no stale claim survives**

Run:

```bash
cd /Users/joao.chaves/Documents/crossfit-app
grep -rn "no mail provider\|No email goes out\|NOT EMAILED\|email delivery is not\|not implemented, so the owner" \
  --include="*.ts" --include="*.tsx" --include="*.md" backend/src frontend/app docs context epics | grep -v node_modules
```

Expected: only hits inside the epic's historical section. Any hit in `backend/src`, `frontend/app`, or a Swagger description is a regression of the 2026-08-20 truth-in-UI invariant.

- [x] **Step 6: Commit**

```bash
git add epics/EMAIL_SERVICE_EPIC.md context/PROJECT_STATE.md context/DECISION_LOG.md docs/COMMAND_MODEL.md
git commit -m "docs(email): record the shipped invite delivery and its two decisions"
```

---

### Task 11: Live verification on staging

**Files:** none — this task changes no code.

**Interfaces:**
- Consumes: the deployed result of Tasks 1–10 and all three human prerequisites.
- Produces: the evidence that closes the epic.

**Blocked until** Resend is signed up, `mail.boxops.dev` is verified, DMARC exists on `_dmarc.boxops.dev`, and `RESEND_API_KEY` + `MAIL_DRIVER=resend` are set on `boxops-api-staging`.

- [x] **Step 1: Deploy and confirm the app booted with the real driver**

```bash
cd backend && flyctl deploy -a boxops-api-staging
curl -s https://api.boxops.dev/health
flyctl logs -a boxops-api-staging | grep -i mail | head
```

Expected: `{"status":"ok","database":"up"}`, and **no** `NOT SENT (log driver)` lines — that string appearing means `MAIL_DRIVER` did not take and nothing is being delivered.

- [x] **Step 2: Send a real athlete invite** — done through the API, not the UI; accepted as a limit.

Log into `https://app.boxops.dev` as the demo owner (`owner@demo.boxops.dev` / `password123`), open Invites, and invite an external address you control.

Expected: the modal reads `Invite emailed to <address>.` and the email arrives.

- [x] **Step 3: Send a real coach invite** — done through the API, not the UI; accepted as a limit.

From the Coaches screen, invite a second external address.

Expected: the coach wording arrives — "invited you to coach at BoxOps Demo Box", mentioning coaching staff and attendance, not booking classes.

- [~] **Step 4: Check the authentication headers** — NOT DONE, accepted as a limit (see the epic's Evidence section: alignment inferred from `dig`).

In the received athlete email, open the original message source and find `Authentication-Results`.

Expected: `spf=pass`, `dkim=pass`, `dmarc=pass`. **Arrival alone does not count** — one inbox accepting a message says nothing about the next one. If DKIM fails, the Resend domain records did not propagate; do not proceed.

- [x] **Step 5: Force a delivery failure** — done via an unverified `MAIL_FROM` instead of a bogus `RESEND_API_KEY`, so no secret had to be restored from memory.

```bash
flyctl secrets set RESEND_API_KEY=re_invalid_but_present -a boxops-api-staging
```

Then create another invite through the UI.

Expected: the app **booted** (presence-only validation), the modal shows the failure copy, the invite is still listed as pending, and Copy link still yields a working `https://app.boxops.dev/invite/...` URL.

- [x] **Step 6: Restore the key**

```bash
flyctl secrets set RESEND_API_KEY=<the real key> -a boxops-api-staging
```

Then create one more invite and confirm it arrives, so staging is not left broken.

- [x] **Step 7: Record the evidence**

Add the run to `context/PROJECT_STATE.md` under the staging section: the two recipient addresses (redacted as needed), the `Authentication-Results` line, and the forced-failure result. Commit.

---

## Self-Review

**Spec coverage.** Every section maps to a task: §3 architecture → Tasks 1–3, 5; §3 configuration → Task 3; §3 the seam → Task 7; §4 templates → Task 4; §5 link source of truth → Tasks 6, 8; §6 owner-facing behaviour → Tasks 7–9; §7 testing → distributed through each task plus Tasks 8–9's suites; §8 done-when → Task 11; §9 documentation → Task 10; §10 out of scope → restated as notes in Tasks 9 and 10.

**Two corrections to the spec, found while reading the code:**

1. **The spec missed a second response DTO.** Coach invites do not use `InviteResponseDto` — they run through `InviteCoachHandler` with `InviteCoachResponseDto`. `delivery` must be added to both, and that DTO's `inviteLink` description ("Email delivery is not implemented") is itself a stale claim. Handled in Task 7, Steps 6–7.
2. **`frontend/e2e/journeys/11-invites-bring-people-in.spec.ts` does not need assertion updates.** The spec said it did; it drives the modal by `testID`, not by button label, so the renames leave it green. Task 9 Step 8 verifies rather than edits.

**One scope note:** `invites.tsx` never fetches an invite list — it holds created invites in local state. So `inviteLink` on `InviteListItemDto` (Task 6) serves `coaches.tsx` only. That is not a gap to fix here; adding a list fetch to the athlete screen is separate work.
