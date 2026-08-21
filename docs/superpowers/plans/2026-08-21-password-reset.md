# Password Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A user who has forgotten their password can request an emailed reset link, set a new password, and be signed in — without anyone else's help.

**Architecture:** A new `password_reset_tokens` table stores `sha256(token)` with a 1-hour single-use lifetime; the plaintext token exists only in the email. A new `PasswordResetService` in the auth domain owns minting, a per-email throttle answered by those same rows, validation, and consumption. Three public endpoints go on the existing `AuthController`. A second mailer (`PasswordResetMailer`) sits above the **unmodified** mail seam. Two new Expo screens plus a link on the login screen and two additions to the navigation guard's public-route list.

**Tech Stack:** NestJS 11, TypeORM (PostgreSQL), `@nestjs/swagger`, `bcrypt`, node `crypto`, jest; Expo / React Native Web, expo-router, `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-08-21-password-reset-design.md`
**Epic:** `epics/PASSWORD_RESET_EPIC.md`

## Global Constraints

Every task's requirements implicitly include all of these. Values are copied verbatim from the spec.

- **Token lifetime is 1 hour, single-use.** Constant: `RESET_TOKEN_TTL_MINUTES = 60`.
- **Throttle window is 15 minutes.** Constant: `RESET_THROTTLE_MINUTES = 15`.
- **The token is stored only as `sha256(token)` hex.** The plaintext must never be written to the database, and must never appear in a log line at `warn` or above. Do **not** follow `InviteEntity.inviteToken`'s plaintext precedent, and do **not** change the invite table.
- **`POST /api/auth/forgot-password` always returns `200` with an empty body** — for a known address, an unknown address, a throttled request, and a failed send alike. No `delivery` field. No response variation of any kind.
- **`POST /api/auth/reset-password` returns exactly one 400 message** for unknown, expired, and already-used tokens: `'This reset link is no longer valid.'`
- **A `MailDeliveryError` must never escape any endpoint.** Same rule as `InviteService.announceInviteLink`.
- **The reissued JWT must come from `AuthService.issueTokenForUser(userId)`.** Never call `jwtService.sign` from reset code — claims resolution must be identical to `login`.
- **Password validation must be identical to `RegisterDto`'s**, which today is `@IsString() @MinLength(1)`. Copy those decorators exactly. Do not "improve" the rule here — a stricter reset rule strands users who registered under the looser one. (Tightening both together is a separate, out-of-scope change.)
- **The mail seam is not modified.** `mail.types.ts`, `mail-driver.factory.ts`, `log.driver.ts` and `resend.driver.ts` must not appear in any diff.
- **Email expiry text uses `timeZone: 'UTC'`** in `toLocaleDateString`, matching `invite-email.ts`.
- **The link is composed in exactly one place**, reading `process.env.FRONTEND_URL` with fallback `'http://localhost:8081'`, mirroring `InviteService.buildInviteLink`.
- **Frontend design:** tokens from `@/constants/design` only — never raw hex, never `theme.ts`/`AppColors`/`Spacing`. All text through the `Text` primitive from `@/components/cleanink` (Named-Face Rule). One accent per view (One Accent Rule). `Status.danger` is destructive-only. **There is no success role** — a completed action is quiet meta text, never a green banner.
- **Frontend types** for these endpoints come from `npm run generate:api-types` (`@/types/api.gen`), not hand-written interfaces.
- **No new npm dependency** in either project.
- **No cron / scheduled cleanup** of expired rows.

---

## File Structure

**Backend — create:**
| File | Responsibility |
|---|---|
| `backend/src/domain/auth/entities/password-reset-token.entity.ts` | The row: `id`, `userId`, `tokenHash`, `expiresAt`, `usedAt`, `createdAt` |
| `backend/src/domain/auth/password-reset.service.ts` | Mint, throttle, validate, consume. The only file that hashes tokens |
| `backend/src/domain/auth/password-reset.service.spec.ts` | Unit tests for the above |
| `backend/src/infrastructure/mail/password-reset-mailer.ts` | The only mail-aware thing the reset domain sees |
| `backend/src/infrastructure/mail/templates/password-reset-email.ts` | `renderPasswordResetEmail` — one template, no role split |
| `backend/src/api/auth/dto/forgot-password.dto.ts` | `{ email }` |
| `backend/src/api/auth/dto/reset-password.dto.ts` | `{ token, password }` |
| `backend/src/api/auth/dto/validate-reset-token-response.dto.ts` | `{ valid }` |
| `backend/src/migrations/<timestamp>-PasswordResetTokens.ts` | Generated, not hand-written |

**Backend — modify:** `src/api/auth/auth.controller.ts` (three endpoints), `src/api/auth/auth.module.ts` (wire the service + `MailModule` + the entity), `src/infrastructure/mail/mail.module.ts` (provide/export the new mailer), `src/config/database.config.ts` (register the entity).

**Frontend — create:** `app/forgot-password.tsx` + `.styles.ts`, `app/reset-password/[token].tsx` + `.styles.ts`, `__tests__/forgot-password.test.tsx`, `__tests__/reset-password.test.tsx`.

**Frontend — modify:** `app/login.tsx` (+ `login.styles.ts`) for the quiet link, `app/_layout.tsx` for the guard.

---

### Task 1: The token entity, its migration, and wiring

**Files:**
- Create: `backend/src/domain/auth/entities/password-reset-token.entity.ts`
- Create: `backend/src/migrations/<timestamp>-PasswordResetTokens.ts` (generated)
- Modify: `backend/src/config/database.config.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `PasswordResetTokenEntity` with fields `id: string`, `userId: string`, `tokenHash: string`, `expiresAt: Date`, `usedAt: Date | null`, `createdAt: Date`.

- [ ] **Step 1: Write the entity**

`backend/src/domain/auth/entities/password-reset-token.entity.ts`:

```ts
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * A single password-reset request.
 *
 * `tokenHash` is sha256(token) hex — the plaintext token exists exactly once,
 * in the email. This deliberately diverges from InviteEntity.inviteToken, which
 * is stored in plaintext: an invite grants membership of one gym an owner can
 * revoke, while this grants the account itself, so a leaked database dump must
 * not be replayable.
 *
 * No status enum. Unlike an invite there is nothing to display and no lifecycle
 * to report — `expiresAt` and `usedAt` answer everything there is to ask.
 */
@Entity('password_reset_tokens')
@Index(['tokenHash'], { unique: true })
@Index(['userId'])
export class PasswordResetTokenEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('varchar', { unique: true })
  tokenHash: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 2: Register the entity so TypeORM sees it**

In `backend/src/config/database.config.ts`, add the import alongside the existing entity imports and add `PasswordResetTokenEntity` to the `entities` array. Follow the file's existing ordering style:

```ts
import { PasswordResetTokenEntity } from '../domain/auth/entities/password-reset-token.entity';
```

An entity absent from this array produces a migration that drops nothing and creates nothing — the generate step below is the check that this worked.

- [ ] **Step 3: Generate the migration**

The database must be running. Run from `backend/`:

```bash
npm run migration:generate -- src/migrations/PasswordResetTokens
```

Expected: a new file `src/migrations/<timestamp>-PasswordResetTokens.ts` containing `CREATE TABLE "password_reset_tokens"` plus the two indexes. Read it. If it contains **any** statement touching another table, stop — that means unrelated schema drift is being swept into this migration; report it rather than committing it.

Do not hand-write this file. This project has exactly one prior migration (`1787264211820-Baseline.ts`) and a drift checker (`npm run schema:check`) that compares entities to the database; a hand-written migration that disagrees with the entity will fail it.

- [ ] **Step 4: Run the migration**

```bash
npm run migration:run
```

Expected: it applies without error.

- [ ] **Step 5: Verify no drift remains**

```bash
npm run schema:check
```

Expected: reports no drift. If it reports drift on `password_reset_tokens`, the entity and the migration disagree — fix the entity, revert (`npm run migration:revert`), delete the generated file, and regenerate.

- [ ] **Step 6: Commit**

```bash
git add backend/src/domain/auth/entities/password-reset-token.entity.ts \
        backend/src/config/database.config.ts \
        backend/src/migrations/
git commit -m "feat(auth): add password_reset_tokens table"
```

---

### Task 2: The email template

**Files:**
- Create: `backend/src/infrastructure/mail/templates/password-reset-email.ts`
- Test: `backend/src/infrastructure/mail/templates/password-reset-email.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `renderPasswordResetEmail(input: PasswordResetEmailInput): RenderedEmail`, where `PasswordResetEmailInput` is `{ recipientName: string | null; resetLink: string; expiresAt: Date }` and `RenderedEmail` is `{ subject: string; html: string; text: string }` — the same shape `invite-email.ts` already exports.

- [ ] **Step 1: Write the failing test**

`backend/src/infrastructure/mail/templates/password-reset-email.spec.ts`:

```ts
import { renderPasswordResetEmail } from './password-reset-email';

describe('renderPasswordResetEmail', () => {
  const baseInput = {
    recipientName: 'Jane Doe',
    resetLink: 'https://app.boxops.dev/reset-password/abc123',
    // 23:30 UTC deliberately: a host in UTC+2 would render this as the 2nd
    // unless the formatter pins timeZone: 'UTC'.
    expiresAt: new Date('2026-09-01T23:30:00.000Z'),
  };

  it('includes the reset link in both the html and the text part', () => {
    const { html, text } = renderPasswordResetEmail(baseInput);
    expect(html).toContain(baseInput.resetLink);
    expect(text).toContain(baseInput.resetLink);
  });

  it('formats the expiry in UTC regardless of the host clock zone', () => {
    const { html } = renderPasswordResetEmail(baseInput);
    expect(html).toContain('1 September 2026');
  });

  it('says the link expires in an hour', () => {
    const { html, text } = renderPasswordResetEmail(baseInput);
    expect(html).toContain('1 hour');
    expect(text).toContain('1 hour');
  });

  it('reassures the reader that ignoring it changes nothing', () => {
    const { text } = renderPasswordResetEmail(baseInput);
    expect(text).toContain('your password has not changed');
  });

  it('uses the accent colour exactly once — One Accent Rule', () => {
    const { html } = renderPasswordResetEmail(baseInput);
    expect(html.match(/#E23B4E/g)).toHaveLength(1);
  });

  it('escapes html in the recipient name', () => {
    const { html } = renderPasswordResetEmail({
      ...baseInput,
      recipientName: '<script>alert(1)</script>',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('greets without a name when there is none', () => {
    const { html } = renderPasswordResetEmail({ ...baseInput, recipientName: null });
    expect(html).toContain('Hi there');
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
cd backend && npx jest src/infrastructure/mail/templates/password-reset-email.spec.ts
```

Expected: FAIL — `Cannot find module './password-reset-email'`.

- [ ] **Step 3: Write the template**

`backend/src/infrastructure/mail/templates/password-reset-email.ts`. Follow `invite-email.ts` in this directory closely — table layout, inline styles, hardcoded hex, a real plain-text alternative. Those constraints look like mistakes and are not; the header comment in `invite-email.ts` explains each.

```ts
/**
 * The password-reset email. One wording — unlike invites there is no role split.
 *
 * Same constraints as invite-email.ts: table layout and inline styles because
 * email clients do not do flexbox; hex values hardcoded rather than importing
 * the frontend's token module across the project boundary; the accent appears
 * exactly once, on the CTA.
 *
 * The CTA reads "Choose a new password" — it describes what the link opens, a
 * screen where the reader types a password. Nothing is reset by clicking.
 */

export interface PasswordResetEmailInput {
  recipientName: string | null;
  resetLink: string;
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

const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// timeZone pinned to UTC: without it the same instant renders as a different
// day depending on the host's clock zone, so staging and a laptop disagree.
function formatExpiry(expiresAt: Date): string {
  return expiresAt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function renderPasswordResetEmail(
  input: PasswordResetEmailInput,
): RenderedEmail {
  const subject = 'Reset your BoxOps password';
  const greeting = input.recipientName
    ? `Hi ${input.recipientName}`
    : 'Hi there';
  const link = input.resetLink;
  const expiry = formatExpiry(input.expiresAt);

  const text = [
    `${greeting},`,
    '',
    'Someone asked to reset the password on your BoxOps account. If it was you, open this link to choose a new one:',
    '',
    link,
    '',
    `The link works for 1 hour (until ${expiry}, UTC) and can be used once.`,
    '',
    'If it was not you, ignore this email — your password has not changed.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:${PAPER};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAPER};padding:32px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:100%;background-color:#FFFFFF;border:1px solid ${HAIRLINE};">
        <tr>
          <td style="padding:28px 28px 12px 28px;font-family:${SANS};font-size:20px;font-weight:700;color:${INK_STRONG};">
            Reset your password
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 16px 28px;font-family:${SANS};font-size:15px;line-height:1.55;color:${INK_STRONG};">
            ${escapeHtml(greeting)}, someone asked to reset the password on your BoxOps account.
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px 28px;font-family:${SANS};font-size:15px;line-height:1.55;color:${INK_MUTED};">
            If it was you, choose a new one below. If it was not, ignore this email — your password has not changed.
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px 28px;">
            <a href="${escapeHtml(link)}" style="display:inline-block;background-color:${ACCENT};color:#FFFFFF;font-family:${SANS};font-size:15px;font-weight:600;text-decoration:none;padding:12px 22px;">
              Choose a new password
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
            This link works for 1 hour — until ${escapeHtml(expiry)} (UTC) — and can be used once.
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

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd backend && npx jest src/infrastructure/mail/templates/password-reset-email.spec.ts
```

Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add backend/src/infrastructure/mail/templates/
git commit -m "feat(mail): add the password reset email template"
```

---

### Task 3: `PasswordResetMailer`

**Files:**
- Create: `backend/src/infrastructure/mail/password-reset-mailer.ts`
- Modify: `backend/src/infrastructure/mail/mail.module.ts`
- Test: `backend/src/infrastructure/mail/password-reset-mailer.spec.ts`

**Interfaces:**
- Consumes: `renderPasswordResetEmail` (Task 2); `MAIL_DRIVER_TOKEN`, `MailDriver` from `./mail.types`.
- Produces: `PasswordResetMailer` with `sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void>`, where `SendPasswordResetEmailInput` is `{ email: string; recipientName: string | null; resetLink: string; expiresAt: Date }`. It **throws** on failure — converting that into a status is the service's job, one layer up.

- [ ] **Step 1: Write the failing test**

`backend/src/infrastructure/mail/password-reset-mailer.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { PasswordResetMailer } from './password-reset-mailer';
import { MAIL_DRIVER_TOKEN, MailDeliveryError } from './mail.types';

describe('PasswordResetMailer', () => {
  const send = jest.fn();

  async function build(): Promise<PasswordResetMailer> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PasswordResetMailer,
        { provide: MAIL_DRIVER_TOKEN, useValue: { send } },
      ],
    }).compile();
    return moduleRef.get(PasswordResetMailer);
  }

  const input = {
    email: 'jane@example.com',
    recipientName: 'Jane Doe',
    resetLink: 'https://app.boxops.dev/reset-password/abc123',
    expiresAt: new Date('2026-09-01T12:00:00.000Z'),
  };

  beforeEach(() => send.mockReset());

  it('sends the rendered message to the requesting address', async () => {
    send.mockResolvedValue(undefined);
    const mailer = await build();

    await mailer.sendPasswordResetEmail(input);

    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0][0];
    expect(message.to).toBe('jane@example.com');
    expect(message.subject).toBe('Reset your BoxOps password');
    expect(message.html).toContain(input.resetLink);
    expect(message.text).toContain(input.resetLink);
  });

  it('sets no replyTo — there is no human sender to reply to', async () => {
    send.mockResolvedValue(undefined);
    const mailer = await build();

    await mailer.sendPasswordResetEmail(input);

    expect(send.mock.calls[0][0].replyTo).toBeUndefined();
  });

  it('lets a delivery failure through — the caller turns it into a status', async () => {
    send.mockRejectedValue(new MailDeliveryError('401 unauthorized'));
    const mailer = await build();

    await expect(mailer.sendPasswordResetEmail(input)).rejects.toThrow(
      MailDeliveryError,
    );
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
cd backend && npx jest src/infrastructure/mail/password-reset-mailer.spec.ts
```

Expected: FAIL — `Cannot find module './password-reset-mailer'`.

- [ ] **Step 3: Write the mailer**

`backend/src/infrastructure/mail/password-reset-mailer.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { MAIL_DRIVER_TOKEN } from './mail.types';
// `import type`: MailDriver is an interface and appears in a decorated
// constructor signature, which emitDecoratorMetadata + isolatedModules would
// otherwise try to emit a runtime reference for (TS1272).
import type { MailDriver } from './mail.types';
import { renderPasswordResetEmail } from './templates/password-reset-email';

export interface SendPasswordResetEmailInput {
  email: string;
  recipientName: string | null;
  resetLink: string;
  expiresAt: Date;
}

/**
 * The only mail-aware thing the password-reset domain sees. It throws on
 * failure — PasswordResetService is what swallows that, so the failure path
 * stays in one place. Mirrors InviteMailer.
 *
 * No replyTo, unlike an invite: there is no inviting human to reply to.
 */
@Injectable()
export class PasswordResetMailer {
  constructor(@Inject(MAIL_DRIVER_TOKEN) private readonly driver: MailDriver) {}

  async sendPasswordResetEmail(
    input: SendPasswordResetEmailInput,
  ): Promise<void> {
    const { subject, html, text } = renderPasswordResetEmail({
      recipientName: input.recipientName,
      resetLink: input.resetLink,
      expiresAt: input.expiresAt,
    });

    await this.driver.send({
      to: input.email,
      subject,
      html,
      text,
    });
  }
}
```

- [ ] **Step 4: Provide and export it from `MailModule`**

In `backend/src/infrastructure/mail/mail.module.ts`, add `PasswordResetMailer` to both `providers` and `exports`, next to `InviteMailer`. Do not touch the `MAIL_DRIVER_TOKEN` factory — the seam is unchanged.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
cd backend && npx jest src/infrastructure/mail/
```

Expected: the new spec and the existing mail specs all pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/infrastructure/mail/
git commit -m "feat(mail): add PasswordResetMailer above the unchanged seam"
```

---

### Task 4: `PasswordResetService`

This is the task that carries the epic's security decisions. Read the spec's §2 before starting.

**Files:**
- Create: `backend/src/domain/auth/password-reset.service.ts`
- Test: `backend/src/domain/auth/password-reset.service.spec.ts`

**Interfaces:**
- Consumes: `PasswordResetTokenEntity` (Task 1); `PasswordResetMailer.sendPasswordResetEmail` (Task 3); `AuthService.issueTokenForUser(userId: string): Promise<string>` (existing, in `./auth.service`); `UserEntity` from `../user/entities/user.entity` (its `passwordHash` is `string | null`).
- Produces:
  - `requestReset(email: string): Promise<void>` — never throws for a caller-visible reason, never reveals anything.
  - `isTokenValid(token: string): Promise<boolean>`
  - `resetPassword(token: string, newPassword: string): Promise<string>` — returns a JWT; throws `BadRequestException('This reset link is no longer valid.')` otherwise.

- [ ] **Step 1: Write the failing tests**

`backend/src/domain/auth/password-reset.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetTokenEntity } from './entities/password-reset-token.entity';
import { UserEntity } from '../user/entities/user.entity';
import { AuthService } from './auth.service';
import { PasswordResetMailer } from '../../infrastructure/mail/password-reset-mailer';
import { MailDeliveryError } from '../../infrastructure/mail/mail.types';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('PasswordResetService', () => {
  let service: PasswordResetService;

  const users = { findOne: jest.fn(), save: jest.fn() };
  const tokens = { findOne: jest.fn(), save: jest.fn(), count: jest.fn() };
  const mailer = { sendPasswordResetEmail: jest.fn() };
  const auth = { issueTokenForUser: jest.fn() };

  const user = {
    id: 'user-1',
    email: 'jane@example.com',
    name: 'Jane Doe',
    passwordHash: 'old-hash',
  } as UserEntity;

  beforeEach(async () => {
    jest.clearAllMocks();
    tokens.count.mockResolvedValue(0);
    tokens.save.mockImplementation((row) => Promise.resolve(row));
    users.findOne.mockResolvedValue(null);
    users.save.mockImplementation((u) => Promise.resolve(u));
    mailer.sendPasswordResetEmail.mockResolvedValue(undefined);
    auth.issueTokenForUser.mockResolvedValue('signed.jwt.token');

    const moduleRef = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: getRepositoryToken(PasswordResetTokenEntity), useValue: tokens },
        { provide: getRepositoryToken(UserEntity), useValue: users },
        { provide: PasswordResetMailer, useValue: mailer },
        { provide: AuthService, useValue: auth },
      ],
    }).compile();

    service = moduleRef.get(PasswordResetService);
  });

  describe('requestReset', () => {
    it('mints no token and sends no mail for an unknown address', async () => {
      users.findOne.mockResolvedValue(null);

      await expect(service.requestReset('nobody@example.com')).resolves.toBeUndefined();

      expect(tokens.save).not.toHaveBeenCalled();
      expect(mailer.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('persists only a hash of the token, never the token itself', async () => {
      users.findOne.mockResolvedValue(user);

      await service.requestReset(user.email);

      const saved = tokens.save.mock.calls[0][0];
      const sentLink = mailer.sendPasswordResetEmail.mock.calls[0][0].resetLink;
      const plaintext = sentLink.split('/').pop() as string;

      expect(saved.tokenHash).toBe(sha256(plaintext));
      expect(saved.tokenHash).not.toBe(plaintext);
      expect(JSON.stringify(saved)).not.toContain(plaintext);
    });

    it('expires the token an hour out and leaves usedAt null', async () => {
      users.findOne.mockResolvedValue(user);
      const before = Date.now();

      await service.requestReset(user.email);

      const saved = tokens.save.mock.calls[0][0];
      const ttlMs = saved.expiresAt.getTime() - before;
      expect(ttlMs).toBeGreaterThan(59 * 60 * 1000);
      expect(ttlMs).toBeLessThanOrEqual(60 * 60 * 1000 + 5000);
      expect(saved.usedAt).toBeNull();
      expect(saved.userId).toBe(user.id);
    });

    it('sends no mail when a recent unused token already exists', async () => {
      users.findOne.mockResolvedValue(user);
      tokens.count.mockResolvedValue(1);

      await service.requestReset(user.email);

      expect(tokens.save).not.toHaveBeenCalled();
      expect(mailer.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('builds the link from FRONTEND_URL', async () => {
      users.findOne.mockResolvedValue(user);
      const previous = process.env.FRONTEND_URL;
      process.env.FRONTEND_URL = 'https://app.boxops.dev';
      try {
        await service.requestReset(user.email);
        const link = mailer.sendPasswordResetEmail.mock.calls[0][0].resetLink;
        expect(link).toMatch(/^https:\/\/app\.boxops\.dev\/reset-password\/.+/);
      } finally {
        process.env.FRONTEND_URL = previous;
      }
    });

    it('swallows a delivery failure — the caller must not learn of it', async () => {
      users.findOne.mockResolvedValue(user);
      mailer.sendPasswordResetEmail.mockRejectedValue(
        new MailDeliveryError('403 unverified sender'),
      );

      await expect(service.requestReset(user.email)).resolves.toBeUndefined();
      // The row survives: the link may still be delivered by another route.
      expect(tokens.save).toHaveBeenCalled();
    });
  });

  describe('isTokenValid', () => {
    it('is true for an unused, unexpired token', async () => {
      tokens.findOne.mockResolvedValue({
        id: 'row-1',
        userId: user.id,
        tokenHash: sha256('plain'),
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      });

      await expect(service.isTokenValid('plain')).resolves.toBe(true);
    });

    it('looks the row up by hash, not by the plaintext token', async () => {
      tokens.findOne.mockResolvedValue(null);

      await service.isTokenValid('plain');

      expect(tokens.findOne).toHaveBeenCalledWith({
        where: { tokenHash: sha256('plain') },
      });
    });

    it('is false for an unknown token', async () => {
      tokens.findOne.mockResolvedValue(null);
      await expect(service.isTokenValid('plain')).resolves.toBe(false);
    });

    it('is false for an expired token', async () => {
      tokens.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1),
        usedAt: null,
      });
      await expect(service.isTokenValid('plain')).resolves.toBe(false);
    });

    it('is false for an already-used token', async () => {
      tokens.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: new Date(),
      });
      await expect(service.isTokenValid('plain')).resolves.toBe(false);
    });
  });

  describe('resetPassword', () => {
    function validRow() {
      return {
        id: 'row-1',
        userId: user.id,
        tokenHash: sha256('plain'),
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      };
    }

    it('stores a new bcrypt hash and returns a token from AuthService', async () => {
      tokens.findOne.mockResolvedValue(validRow());
      users.findOne.mockResolvedValue({ ...user });
      users.save = jest.fn().mockImplementation((u) => Promise.resolve(u));

      const jwt = await service.resetPassword('plain', 'brand-new-password');

      expect(jwt).toBe('signed.jwt.token');
      expect(auth.issueTokenForUser).toHaveBeenCalledWith(user.id);

      const savedUser = users.save.mock.calls[0][0];
      expect(savedUser.passwordHash).not.toBe('old-hash');
      await expect(
        bcrypt.compare('brand-new-password', savedUser.passwordHash),
      ).resolves.toBe(true);
    });

    it('marks the token used so it cannot be replayed', async () => {
      tokens.findOne.mockResolvedValue(validRow());
      users.findOne.mockResolvedValue({ ...user });
      users.save = jest.fn().mockImplementation((u) => Promise.resolve(u));

      await service.resetPassword('plain', 'brand-new-password');

      const savedRow = tokens.save.mock.calls[0][0];
      expect(savedRow.usedAt).toBeInstanceOf(Date);
    });

    it.each([
      ['unknown', null],
      ['expired', { ...{ id: 'r', userId: 'user-1', tokenHash: 'h' }, expiresAt: new Date(Date.now() - 1), usedAt: null }],
      ['used', { ...{ id: 'r', userId: 'user-1', tokenHash: 'h' }, expiresAt: new Date(Date.now() + 60_000), usedAt: new Date() }],
    ])('rejects a %s token with one indistinguishable message', async (_label, row) => {
      tokens.findOne.mockResolvedValue(row);

      await expect(service.resetPassword('plain', 'whatever')).rejects.toThrow(
        new BadRequestException('This reset link is no longer valid.'),
      );
    });

    it('rejects when the token is valid but its user has vanished', async () => {
      tokens.findOne.mockResolvedValue(validRow());
      users.findOne.mockResolvedValue(null);

      await expect(service.resetPassword('plain', 'whatever')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

```bash
cd backend && npx jest src/domain/auth/password-reset.service.spec.ts
```

Expected: FAIL — `Cannot find module './password-reset.service'`.

- [ ] **Step 3: Write the service**

`backend/src/domain/auth/password-reset.service.ts`:

```ts
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository, IsNull } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuid } from 'uuid';
import * as bcrypt from 'bcrypt';
import { PasswordResetTokenEntity } from './entities/password-reset-token.entity';
import { UserEntity } from '../user/entities/user.entity';
import { AuthService } from './auth.service';
import { PasswordResetMailer } from '../../infrastructure/mail/password-reset-mailer';

const TOKEN_BYTE_LENGTH = 32;
const RESET_TOKEN_TTL_MINUTES = 60;
const RESET_THROTTLE_MINUTES = 15;

/** One indistinguishable message for unknown, expired and already-used alike:
 *  telling them apart tells an attacker which tokens have existed. */
const INVALID_TOKEN_MESSAGE = 'This reset link is no longer valid.';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @InjectRepository(PasswordResetTokenEntity)
    private readonly tokenRepository: Repository<PasswordResetTokenEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly mailer: PasswordResetMailer,
    private readonly authService: AuthService,
  ) {}

  /**
   * Request a reset link.
   *
   * Returns void on every path — unknown address, throttled, delivered, failed.
   * The caller is an anonymous stranger, so any variation in the response is an
   * account-enumeration oracle, and `failed` would tell them nothing they could
   * act on (unlike an invite, where the owner can copy the link).
   */
  async requestReset(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      return;
    }

    // Per-email throttle. The rows we already write are the record, so this
    // needs no dependency and no shared store — which matters because staging
    // runs two Fly machines and an in-memory counter would cap at 2x the rate.
    const recentCutoff = new Date(
      Date.now() - RESET_THROTTLE_MINUTES * 60 * 1000,
    );
    const recent = await this.tokenRepository.count({
      where: {
        userId: user.id,
        usedAt: IsNull(),
        createdAt: MoreThan(recentCutoff),
      },
    });
    if (recent > 0) {
      return;
    }

    const token = randomBytes(TOKEN_BYTE_LENGTH)
      .toString('base64url')
      .slice(0, 43);

    const expiresAt = new Date(
      Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000,
    );

    const row = new PasswordResetTokenEntity();
    row.id = uuid();
    row.userId = user.id;
    row.tokenHash = this.hashToken(token);
    row.expiresAt = expiresAt;
    row.usedAt = null;

    await this.tokenRepository.save(row);

    await this.deliver(user, token, expiresAt);
  }

  async isTokenValid(token: string): Promise<boolean> {
    return (await this.findUsableRow(token)) !== null;
  }

  async resetPassword(token: string, newPassword: string): Promise<string> {
    const row = await this.findUsableRow(token);
    if (!row) {
      throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    }

    const user = await this.userRepository.findOne({
      where: { id: row.userId },
    });
    if (!user) {
      throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    row.usedAt = new Date();
    await this.tokenRepository.save(row);

    // Through AuthService, never jwtService.sign: the claims' gym/role
    // resolution must be byte-identical to what login produces.
    return this.authService.issueTokenForUser(user.id);
  }

  /**
   * Delivery. MUST NOT throw: the row is already persisted, and the caller
   * must not learn whether the send worked. Mirrors
   * InviteService.announceInviteLink, minus the returned status.
   */
  private async deliver(
    user: UserEntity,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    try {
      await this.mailer.sendPasswordResetEmail({
        email: user.email,
        recipientName: user.name ?? null,
        resetLink: this.buildResetLink(token),
        expiresAt,
      });
    } catch (err) {
      // The address, never the token: a log line carrying the plaintext would
      // put an account-takeover credential into log storage.
      this.logger.warn(
        `Password reset for ${user.email} was requested but NOT delivered: ` +
          `${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async findUsableRow(
    token: string,
  ): Promise<PasswordResetTokenEntity | null> {
    const row = await this.tokenRepository.findOne({
      where: { tokenHash: this.hashToken(token) },
    });
    if (!row) return null;
    if (row.usedAt !== null) return null;
    if (new Date() > row.expiresAt) return null;
    return row;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * The single place a reset link is composed, mirroring
   * InviteService.buildInviteLink. The fallback is localhost, not a
   * plausible-looking domain: a link that looks correct and goes nowhere fails
   * silently, and every deployed environment sets FRONTEND_URL.
   */
  private buildResetLink(token: string): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
    return `${frontendUrl}/reset-password/${token}`;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd backend && npx jest src/domain/auth/password-reset.service.spec.ts
```

Expected: all passing. If the `it.each` rejection cases fail on the message, check that `BadRequestException` carries the exact string `'This reset link is no longer valid.'`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/auth/password-reset.service.ts \
        backend/src/domain/auth/password-reset.service.spec.ts
git commit -m "feat(auth): add PasswordResetService with hashed single-use tokens"
```

---

### Task 5: The three endpoints

**Files:**
- Create: `backend/src/api/auth/dto/forgot-password.dto.ts`
- Create: `backend/src/api/auth/dto/reset-password.dto.ts`
- Create: `backend/src/api/auth/dto/validate-reset-token-response.dto.ts`
- Modify: `backend/src/api/auth/auth.controller.ts`
- Modify: `backend/src/api/auth/auth.module.ts`
- Test: `backend/src/api/auth/auth.controller.password-reset.spec.ts`

**Interfaces:**
- Consumes: `PasswordResetService.requestReset / isTokenValid / resetPassword` (Task 4).
- Produces: `POST /api/auth/forgot-password` (200, empty body), `POST /api/auth/reset-password` (200, `LoginResponseDto`), `GET /api/auth/reset-password/:token/validate` (200, `ValidateResetTokenResponseDto` = `{ valid: boolean }`).

- [ ] **Step 1: Write the failing test**

`backend/src/api/auth/auth.controller.password-reset.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../../domain/auth/auth.service';
import { PasswordResetService } from '../../domain/auth/password-reset.service';

describe('AuthController — password reset', () => {
  let controller: AuthController;
  const reset = {
    requestReset: jest.fn(),
    isTokenValid: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    reset.requestReset.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: PasswordResetService, useValue: reset },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  it('answers forgot-password identically for a known and an unknown address', async () => {
    const known = await controller.forgotPassword({ email: 'jane@example.com' });
    const unknown = await controller.forgotPassword({ email: 'nobody@example.com' });

    expect(known).toBeUndefined();
    expect(unknown).toBeUndefined();
    expect(reset.requestReset).toHaveBeenNthCalledWith(1, 'jane@example.com');
    expect(reset.requestReset).toHaveBeenNthCalledWith(2, 'nobody@example.com');
  });

  it('reports token validity', async () => {
    reset.isTokenValid.mockResolvedValue(false);
    await expect(controller.validateResetToken('abc')).resolves.toEqual({
      valid: false,
    });
  });

  it('returns an access token on a successful reset', async () => {
    reset.resetPassword.mockResolvedValue('signed.jwt.token');

    await expect(
      controller.resetPassword({ token: 'abc', password: 'new-password' }),
    ).resolves.toEqual({ accessToken: 'signed.jwt.token' });

    expect(reset.resetPassword).toHaveBeenCalledWith('abc', 'new-password');
  });

  it('lets the service’s rejection through unchanged', async () => {
    const failure = new Error('This reset link is no longer valid.');
    reset.resetPassword.mockRejectedValue(failure);

    await expect(
      controller.resetPassword({ token: 'abc', password: 'new-password' }),
    ).rejects.toThrow(failure);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
cd backend && npx jest src/api/auth/auth.controller.password-reset.spec.ts
```

Expected: FAIL — `controller.forgotPassword is not a function` (and a missing-module error for `PasswordResetService` if Task 4 was skipped).

- [ ] **Step 3: Write the DTOs**

`backend/src/api/auth/dto/forgot-password.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address to send a reset link to',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;
}
```

`backend/src/api/auth/dto/reset-password.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'The token from the reset link',
    example: 'k7Qd3Zk1t0m9vY6bF2sN8pR4wJ5xL1cH0aT7uE3gQ2i',
  })
  @IsString()
  @MinLength(1)
  token: string;

  // Deliberately identical to RegisterDto's rule. A stricter rule here would
  // strand users who registered under the looser one; a looser one would let an
  // account be reset into a password it could never have registered with.
  @ApiProperty({
    description: 'The new password (minimum 1 character)',
    example: 'secret123',
  })
  @IsString()
  @MinLength(1)
  password: string;
}
```

`backend/src/api/auth/dto/validate-reset-token-response.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

export class ValidateResetTokenResponseDto {
  @ApiProperty({
    description:
      'Whether the reset link can still be used. False covers unknown, expired and already-used alike — the three are not distinguished.',
    example: true,
  })
  valid: boolean;
}
```

- [ ] **Step 4: Add the endpoints to the controller**

In `backend/src/api/auth/auth.controller.ts`: inject `PasswordResetService` alongside `AuthService`, import the three DTOs, and add the endpoints. All three are public — no `@UseGuards(JwtAuthGuard)`, no `@ApiBearerAuth()`.

```ts
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a password reset link',
    description:
      'Always returns 200 with an empty body — for a known address, an unknown address, a throttled request and a failed send alike. Any variation would be an account-enumeration oracle, and a delivery status would tell an anonymous caller nothing they could act on.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Request accepted. Reveals nothing about the address.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error (malformed email).',
  })
  async forgotPassword(@Body() body: ForgotPasswordDto): Promise<void> {
    await this.passwordResetService.requestReset(body.email);
  }

  @Get('reset-password/:token/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check whether a reset link is still usable',
    description:
      'Lets the reset screen show an expired state on mount instead of after the user has typed a new password twice.',
  })
  @ApiParam({ name: 'token', description: 'The token from the reset link' })
  @ApiResponse({
    status: 200,
    description: 'Validity of the token.',
    type: ValidateResetTokenResponseDto,
  })
  async validateResetToken(
    @Param('token') token: string,
  ): Promise<ValidateResetTokenResponseDto> {
    return { valid: await this.passwordResetService.isTokenValid(token) };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set a new password using a reset link',
    description:
      'On success the user is signed in: the response carries a JWT, as register and login do. Sessions issued before the reset are NOT revoked — an accepted limit recorded in epics/PASSWORD_RESET_EPIC.md.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed. Returns a signed JWT access token.',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'The reset link is unknown, expired or already used — the three are deliberately indistinguishable. Also returned for validation errors.',
  })
  async resetPassword(
    @Body() body: ResetPasswordDto,
  ): Promise<LoginResponseDto> {
    const accessToken = await this.passwordResetService.resetPassword(
      body.token,
      body.password,
    );
    return { accessToken };
  }
```

Add `Get` and `Param` to the `@nestjs/common` import and `ApiParam` to the `@nestjs/swagger` import — the file currently imports neither.

- [ ] **Step 5: Wire the module**

In `backend/src/api/auth/auth.module.ts`:
- add `PasswordResetTokenEntity` to the `TypeOrmModule.forFeature([...])` array,
- add `MailModule` to `imports`,
- add `PasswordResetService` to `providers`.

Leave the `JwtModule.register` block and the existing `exports` untouched.

- [ ] **Step 6: Run the tests to verify they pass**

```bash
cd backend && npx jest src/api/auth/ src/domain/auth/
```

Expected: the new spec passes and the existing auth specs still pass.

- [ ] **Step 7: Verify the whole backend still compiles and its suite is green**

```bash
cd backend && npx tsc --noEmit && npm test
```

Expected: no type errors; the full jest suite green. A missing provider in `AuthModule` shows up here, not in the controller unit test — the unit test supplies its own mock.

- [ ] **Step 8: Check the Swagger schema by eye**

Start the API (`npm run start:dev`) and open `http://localhost:3000/api-docs`. Confirm all three endpoints appear under **Auth**, that `forgot-password` shows no response body, and that `reset-password` shows `LoginResponseDto`. Swagger is the authoritative API contract in this repo and the frontend generates its types from it.

- [ ] **Step 9: Commit**

```bash
git add backend/src/api/auth/
git commit -m "feat(auth): add forgot-password, reset-password and validate endpoints"
```

---

### Task 6: Generate the frontend API types

**Files:**
- Modify: `frontend/types/api.gen.ts` (generated — do not edit by hand)

**Interfaces:**
- Consumes: the Swagger schema from Task 5.
- Produces: `components['schemas']['ResetPasswordDto']`, `['ForgotPasswordDto']`, `['ValidateResetTokenResponseDto']`, `['LoginResponseDto']` in `@/types/api.gen`.

- [ ] **Step 1: Generate**

With the backend running:

```bash
cd frontend && npm run generate:api-types
```

- [ ] **Step 2: Verify the new schemas landed**

```bash
cd frontend && grep -n "ValidateResetTokenResponseDto\|ResetPasswordDto\|ForgotPasswordDto" types/api.gen.ts
```

Expected: all three appear. If they don't, the running backend is stale — rebuild and restart it. A missing schema means the endpoint is not implemented in the backend, which is the signal this project relies on.

- [ ] **Step 3: Commit**

```bash
git add frontend/types/api.gen.ts
git commit -m "chore(frontend): regenerate api types for password reset"
```

---

### Task 7: The forgot-password screen

**Files:**
- Create: `frontend/app/forgot-password.tsx`
- Create: `frontend/app/forgot-password.styles.ts`
- Test: `frontend/__tests__/forgot-password.test.tsx`

**Interfaces:**
- Consumes: `createApiClient({})` and `ApiError` from `@/utils/api-client`; `Text`, `Icon`, `Button` from `@/components/cleanink`; `Ink`, `Status` from `@/constants/design`; `useKeyboardAwareScroll` from `@/hooks/useKeyboardAwareScroll`.
- Produces: a default-exported `ForgotPasswordScreen`, and these testIDs for later tasks and e2e: `forgot-email-input`, `forgot-submit-btn`, `forgot-sent-message`, `forgot-back-to-login`.

Use `frontend/app/login.tsx` as the exemplar for shape — brand block, single card, `useKeyboardAwareScroll`, footer link — and copy its `login.styles.ts` structure into `forgot-password.styles.ts`. **Read both before writing.** Every colour and spacing value must come from `@/constants/design`.

- [ ] **Step 1: Write the failing test**

`frontend/__tests__/forgot-password.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const mockPost = jest.fn();
jest.mock('@/utils/api-client', () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return {
    ApiError,
    createApiClient: () => ({ post: mockPost }),
  };
});

import ForgotPasswordScreen from '@/app/forgot-password';

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue(undefined);
  });

  it('posts the address to forgot-password', async () => {
    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('forgot-email-input'), 'jane@example.com');
    fireEvent.press(screen.getByTestId('forgot-submit-btn'));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/api/auth/forgot-password', {
        email: 'jane@example.com',
      }),
    );
  });

  it('shows the same confirmation whether or not the account exists', async () => {
    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('forgot-email-input'), 'nobody@example.com');
    fireEvent.press(screen.getByTestId('forgot-submit-btn'));

    const confirmation = await screen.findByTestId('forgot-sent-message');
    expect(confirmation).toHaveTextContent(/If an account exists for that address/i);
    // The form is gone — there is nothing to resubmit and nothing to compare.
    expect(screen.queryByTestId('forgot-submit-btn')).toBeNull();
  });

  it('shows the confirmation even when the request fails, revealing nothing', async () => {
    const { ApiError } = jest.requireMock('@/utils/api-client');
    mockPost.mockRejectedValue(new ApiError(500, 'boom'));

    render(<ForgotPasswordScreen />);
    fireEvent.changeText(screen.getByTestId('forgot-email-input'), 'jane@example.com');
    fireEvent.press(screen.getByTestId('forgot-submit-btn'));

    expect(await screen.findByTestId('forgot-sent-message')).toBeTruthy();
  });

  it('offers a way back to login', () => {
    render(<ForgotPasswordScreen />);
    fireEvent.press(screen.getByTestId('forgot-back-to-login'));
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('does not submit an empty address', () => {
    render(<ForgotPasswordScreen />);
    fireEvent.press(screen.getByTestId('forgot-submit-btn'));
    expect(mockPost).not.toHaveBeenCalled();
  });
});
```

Note the third test: **a failed request must still show the confirmation.** A visible error would leak that this address was special. That is the one place this screen deliberately lies about an outcome, and it is why it needs a test.

- [ ] **Step 2: Run it to make sure it fails**

```bash
cd frontend && npx jest __tests__/forgot-password.test.tsx
```

Expected: FAIL — cannot resolve `@/app/forgot-password`.

- [ ] **Step 3: Build the screen**

`frontend/app/forgot-password.tsx`. Requirements, all load-bearing:

- Two phases in one screen: `'form'` and `'sent'`. On submit, always transition to `'sent'` — in the `try` **and** the `catch`. Never render an error for a failed submit.
- The confirmation copy is exactly: `If an account exists for that address, we've sent a reset link. It expires in an hour.` Render it as `Text size="body" tone={Ink.muted}` — quiet meta text, **not** a green banner. There is no success role in this design system.
- **Exactly one accent on the view**: the `Button variant="primary"` labelled `Send reset link`. The back-to-login control is a `TouchableOpacity` wrapping `Text size="body" weight="semibold"`, matching login's footer "Sign up" link.
- Guard the submit on a non-empty, trimmed email so the empty-submit test passes, and disable the input while loading (`editable={!isLoading}`), as login does.
- Trim the address before posting.
- Use `createApiClient({})` with no token — this route is unauthenticated.
- Reachability: `app/_layout.tsx`'s `<Stack>` needs `<Stack.Screen name="forgot-password" options={{ headerShown: false }} />` added next to the existing `login` entry. Add it in this task; the guard change is Task 9.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd frontend && npx jest __tests__/forgot-password.test.tsx
```

Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/forgot-password.tsx frontend/app/forgot-password.styles.ts \
        frontend/app/_layout.tsx frontend/__tests__/forgot-password.test.tsx
git commit -m "feat(auth): add the forgot-password screen"
```

---

### Task 8: The reset-password screen

**Files:**
- Create: `frontend/app/reset-password/[token].tsx`
- Create: `frontend/app/reset-password/[token].styles.ts`
- Test: `frontend/__tests__/reset-password.test.tsx`

**Interfaces:**
- Consumes: `createApiClient`, `ApiError` from `@/utils/api-client`; `AuthContext` from `@/context/AuthContext`; `routeForRole` from `@/utils/routeForRole`; `useLocalSearchParams` / `useRouter` from `expo-router`; `GET /api/auth/reset-password/:token/validate` and `POST /api/auth/reset-password` (Task 5).
- Produces: testIDs `reset-password-input`, `reset-confirm-input`, `reset-submit-btn`, `reset-invalid-message`, `reset-request-new-link`, `reset-error`.

Exemplar: `frontend/app/invite/[inviteToken].tsx` — the shipped token-in-URL screen, with the same loading → invalid → form phase machine. **Read it before writing.**

- [ ] **Step 1: Write the failing test**

`frontend/__tests__/reset-password.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => ({ token: 'reset-token-abc' }),
}));

const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('@/utils/api-client', () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return { ApiError, createApiClient: () => ({ get: mockGet, post: mockPost }) };
});

const mockLogin = jest.fn();
const mockRouteForRole = jest.fn();
jest.mock('@/utils/routeForRole', () => ({
  routeForRole: (...args: unknown[]) => mockRouteForRole(...args),
}));

import { AuthContext } from '@/context/AuthContext';
import ResetPasswordScreen from '@/app/reset-password/[token]';

function renderScreen() {
  return render(
    <AuthContext.Provider
      value={
        {
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          login: mockLogin,
          logout: jest.fn(),
        } as never
      }>
      <ResetPasswordScreen />
    </AuthContext.Provider>,
  );
}

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ valid: true });
    mockPost.mockResolvedValue({ accessToken: 'header.eyJyb2xlIjoiYXRobGV0ZSJ9.sig' });
    mockLogin.mockResolvedValue(undefined);
  });

  it('validates the token from the url on mount', async () => {
    renderScreen();
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(
        '/api/auth/reset-password/reset-token-abc/validate',
      ),
    );
  });

  it('shows an invalid state without ever asking for a password', async () => {
    mockGet.mockResolvedValue({ valid: false });

    renderScreen();

    expect(await screen.findByTestId('reset-invalid-message')).toBeTruthy();
    expect(screen.queryByTestId('reset-password-input')).toBeNull();
  });

  it('routes back to forgot-password from the invalid state', async () => {
    mockGet.mockResolvedValue({ valid: false });
    renderScreen();

    fireEvent.press(await screen.findByTestId('reset-request-new-link'));
    expect(mockPush).toHaveBeenCalledWith('/forgot-password');
  });

  it('treats a failed validation call as an invalid link', async () => {
    const { ApiError } = jest.requireMock('@/utils/api-client');
    mockGet.mockRejectedValue(new ApiError(500, 'boom'));

    renderScreen();

    expect(await screen.findByTestId('reset-invalid-message')).toBeTruthy();
  });

  it('refuses to submit when the two passwords differ', async () => {
    renderScreen();
    fireEvent.changeText(await screen.findByTestId('reset-password-input'), 'aaaa1111');
    fireEvent.changeText(screen.getByTestId('reset-confirm-input'), 'bbbb2222');
    fireEvent.press(screen.getByTestId('reset-submit-btn'));

    expect(await screen.findByTestId('reset-error')).toHaveTextContent(
      /do not match/i,
    );
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('posts the new password, signs in, and routes by role', async () => {
    renderScreen();
    fireEvent.changeText(await screen.findByTestId('reset-password-input'), 'aaaa1111');
    fireEvent.changeText(screen.getByTestId('reset-confirm-input'), 'aaaa1111');
    fireEvent.press(screen.getByTestId('reset-submit-btn'));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/api/auth/reset-password', {
        token: 'reset-token-abc',
        password: 'aaaa1111',
      }),
    );
    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith('header.eyJyb2xlIjoiYXRobGV0ZSJ9.sig'),
    );
    await waitFor(() => expect(mockRouteForRole).toHaveBeenCalled());
  });

  it('shows the backend message when the token dies between mount and submit', async () => {
    const { ApiError } = jest.requireMock('@/utils/api-client');
    mockPost.mockRejectedValue(
      new ApiError(400, 'This reset link is no longer valid.'),
    );

    renderScreen();
    fireEvent.changeText(await screen.findByTestId('reset-password-input'), 'aaaa1111');
    fireEvent.changeText(screen.getByTestId('reset-confirm-input'), 'aaaa1111');
    fireEvent.press(screen.getByTestId('reset-submit-btn'));

    expect(await screen.findByTestId('reset-error')).toHaveTextContent(
      /no longer valid/i,
    );
    expect(mockLogin).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
cd frontend && npx jest __tests__/reset-password.test.tsx
```

Expected: FAIL — cannot resolve `@/app/reset-password/[token]`.

- [ ] **Step 3: Build the screen**

`frontend/app/reset-password/[token].tsx`. Requirements:

- A three-phase state machine, following `invite/[inviteToken].tsx`: `'loading'` → `'invalid'` | `'form'`. Validate on mount with `createApiClient({}).get<{ valid: boolean }>(...)`; **any** thrown error or `valid: false` lands in `'invalid'` — a network failure must not present a password form the backend will reject.
- The invalid state's copy: `This reset link has expired or has already been used.` plus a control labelled `Request a new link` that pushes `/forgot-password`.
- The form has two secure fields (`New password`, `Confirm new password`). Mismatch is checked client-side before any request and renders `Passwords do not match.` in `Status.danger` — this one **is** an error, unlike the forgot screen's silence.
- On success: `await auth.login(response.accessToken)`, then `routeForRole(router, role)` where `role` is decoded from the token exactly as `login.tsx`'s `getRoleFromToken` does. Copy that helper into this file rather than importing it — it is a private helper in `login.tsx`, and exporting it is a refactor this task does not own.
- Unlike `login.tsx`, do **not** set gym context here: `issueTokenForUser` already resolves the gym into the claims, and the reset screen is not a place to change gyms.
- One accent only: the `Send`/`Set new password` primary button. In the invalid phase the single accent is `Request a new link`.
- No success banner. The transition away from the screen *is* the confirmation.
- Add `<Stack.Screen name="reset-password/[token]" options={{ headerShown: false }} />` to `app/_layout.tsx`, matching how the invite route is registered (check the existing entry's exact name form and follow it).

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd frontend && npx jest __tests__/reset-password.test.tsx
```

Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/reset-password/ frontend/app/_layout.tsx \
        frontend/__tests__/reset-password.test.tsx
git commit -m "feat(auth): add the reset-password screen"
```

---

### Task 9: The login link and the navigation guard

Small, but the guard half is what makes the whole feature reachable from a mail client. It gets its own task because it is the one change a reviewer must not miss.

**Files:**
- Modify: `frontend/app/login.tsx`, `frontend/app/login.styles.ts`
- Modify: `frontend/app/_layout.tsx:27-32`
- Test: `frontend/__tests__/forgot-password.test.tsx` (extend)

**Interfaces:**
- Consumes: `/forgot-password` (Task 7) and `/reset-password/:token` (Task 8) routes.
- Produces: testID `login-forgot-link` on the login screen.

- [ ] **Step 1: Write the failing test**

Append to `frontend/__tests__/forgot-password.test.tsx`:

```tsx
describe('the navigation guard’s public routes', () => {
  // The guard bounces every non-exempt route to /login when signed out, so a
  // reset link opened from a mail client would land on the login screen and the
  // whole flow would be unreachable. This asserts the exemption list directly.
  const isPublicRoute = (pathname: string): boolean =>
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/reset-password/') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password';

  it.each([
    '/forgot-password',
    '/reset-password/abc123',
    '/login',
    '/register',
    '/invite/xyz',
  ])('treats %s as public', (pathname) => {
    expect(isPublicRoute(pathname)).toBe(true);
  });

  it.each(['/(tabs)/schedule', '/members'])('keeps %s guarded', (pathname) => {
    expect(isPublicRoute(pathname)).toBe(false);
  });
});
```

This duplicates the predicate rather than importing it, because `_layout.tsx` does not export it. **After making the change in Step 3, diff the two by eye — they must match exactly.** If a later change makes them drift, extract the predicate into `frontend/utils/isPublicRoute.ts`, import it in both, and delete the copy.

- [ ] **Step 2: Run it to confirm the intended predicate is captured**

```bash
cd frontend && npx jest __tests__/forgot-password.test.tsx
```

Expected: PASS (the test asserts the predicate the next step installs; it is a specification, not a red test).

- [ ] **Step 3: Update the guard**

In `frontend/app/_layout.tsx`, extend `isPublicRoute` and its comment:

```ts
  // Public (signed-out) routes the guard must never bounce to /login: the invite
  // and password-reset deep links plus the auth screens themselves. Without
  // /register here the guard redirects any unauthenticated visitor off the
  // sign-up screen straight back to login, making registration (and the
  // invite → register hand-off) unreachable — and without /reset-password/ a
  // reset link opened from a mail client lands on login instead of the form.
  const isPublicRoute =
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/reset-password/') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password';
```

- [ ] **Step 4: Add the link to the login screen**

In `frontend/app/login.tsx`, below the submit `Button` inside the form card, add:

```tsx
          {/* Quiet, not accented: the Log In button owns the one accent on this
              view (One Accent Rule). */}
          <TouchableOpacity
            testID="login-forgot-link"
            onPress={() => router.push('/forgot-password' as never)}>
            <Text size="meta" tone={Ink.muted} style={styles.forgotLink}>
              Forgot password?
            </Text>
          </TouchableOpacity>
```

Add a `forgotLink` entry to `login.styles.ts` for its spacing and centring, taking values from `@/constants/design` — match the neighbouring style entries' idiom.

- [ ] **Step 5: Verify the frontend is green and type-clean**

```bash
cd frontend && npx tsc --noEmit && npm test
```

Expected: no type errors; the full jest suite green, including the existing suites.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/login.tsx frontend/app/login.styles.ts \
        frontend/app/_layout.tsx frontend/__tests__/forgot-password.test.tsx
git commit -m "feat(auth): link to forgot-password and exempt the reset routes from the guard"
```

---

### Task 10: Live verification and documentation

No new code. This task proves the flow works against a running stack and closes the docs, which is mandatory in this repo.

**Files:**
- Modify: `epics/PASSWORD_RESET_EPIC.md`
- Modify: `context/PROJECT_STATE.md`
- Modify: `context/DECISION_LOG.md`

- [ ] **Step 1: Walk the flow end to end against the log driver**

Start the backend (`npm run start:dev`) and the frontend (`npm start`). `MAIL_DRIVER` must be **unset** so the non-sending log driver runs.

1. Open `/login`, press **Forgot password?**, submit the email of a real dev user (`owner@example.com`).
2. Read the backend log. The log driver prints the rendered message — copy the `/reset-password/<token>` link out of it.
3. Open that link in a **signed-out** browser. Confirm it reaches the form and is *not* bounced to `/login`. This is the guard check; nothing else exercises it.
4. Set a new password. Confirm you land on the role's home screen, signed in.
5. Log out and log back in with the **new** password. Then confirm the **old** password is rejected.
6. Re-open the same reset link. Confirm the invalid state — single-use is enforced.

- [ ] **Step 2: Verify the two silent paths**

7. Submit `no-such-user@example.com` on the forgot screen. Confirm the confirmation text is **identical** to step 1's and that the backend log shows no send.
8. Submit the same real address twice inside 15 minutes. Confirm the second produces the same confirmation and **no second message** in the log — the throttle.

- [ ] **Step 3: Screenshot review at both registers**

Review both screens live at desktop **1280×832** and mobile **390×844** — all four states: the form, the confirmation, the invalid link, and a mismatch error. Check against `frontend/DESIGN.md`: one accent per view, hairlines not shadows, all text through the `Text` primitive, no green success anything.

- [ ] **Step 4: Run the full suites one last time**

```bash
cd backend && npx tsc --noEmit && npm test
cd ../frontend && npx tsc --noEmit && npm test
```

- [ ] **Step 5: Close the epic**

In `epics/PASSWORD_RESET_EPIC.md`: set **Status** to `✅ COMPLETE` with the date, mark all seven tasks `✅ DONE`, tick every acceptance-criteria box **only where the evidence above actually covers it**, and add an Evidence section recording what was verified live and — explicitly — what was not. If the live send through real Resend was skipped, say so there rather than implying it passed.

- [ ] **Step 6: Record the two decisions**

Add to `context/DECISION_LOG.md`:
- **Reset tokens are stored hashed** — a deliberate divergence from the plaintext `InviteEntity.inviteToken`, justified by blast radius: a reset token grants the account, an invite grants revocable membership of one gym.
- **A password reset does not revoke existing sessions** — revocation would need `passwordChangedAt` in the claims plus a guard check, i.e. a database read per authenticated request, to defend a threat this flow is not answering.

- [ ] **Step 7: Update the project state**

In `context/PROJECT_STATE.md`, replace the `📋 Password reset — designed and scoped` paragraph with a `✅` one, and carry forward the accepted limits from the epic — in particular that **a new environment delivers nothing until `MAIL_DRIVER=resend` and `RESEND_API_KEY` are set on it**, since a working local walkthrough over the log driver looks identical to a working deployment.

- [ ] **Step 8: Commit**

```bash
git add epics/PASSWORD_RESET_EPIC.md context/PROJECT_STATE.md context/DECISION_LOG.md
git commit -m "docs(auth): close the password reset epic with live evidence"
```

---

## Deferred, deliberately

Do not build these here. Each is recorded in the spec's §8 and the epic's follow-ups:

- Global IP rate limiting with a store that survives staging's two Fly machines.
- Cleanup of expired token rows (blocked on the duplicate-cron problem).
- Change-password while signed in; owner-triggered reset; set-password for invited users with a null `passwordHash`.
- Session revocation on reset (`passwordChangedAt` in the claims + a guard check).
- Tightening the shared password rule above `MinLength(1)` — a change to registration and reset together, not to reset alone.
