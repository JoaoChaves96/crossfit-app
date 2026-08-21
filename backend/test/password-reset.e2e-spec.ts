import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PasswordResetMailer } from '../src/infrastructure/mail/password-reset-mailer';
import { listenOnEphemeralPort } from './helpers/listen';

/**
 * Password reset E2E — the parts that only a real database can prove.
 *
 * Endpoints:
 *   POST /api/auth/forgot-password              → 200 empty, always
 *   GET  /api/auth/reset-password/:token/validate → { valid: boolean }
 *   POST /api/auth/reset-password               → { accessToken }
 *
 * password-reset.service.spec.ts already covers the branches with mocked
 * repositories. This suite exists for the two things that cannot be mocked:
 *
 *  1. **The throttle actually throttles.** The unit spec stubs `count` to 1, so
 *     it proves the early return and never the query behind it. The query was in
 *     fact dead: `createdAt` came from the column's `DEFAULT now()` (the database
 *     clock, UTC) while the cutoff is computed from the app clock, and a naive
 *     `timestamp` column round-trips through the process zone. Under a non-UTC
 *     app the two disagreed by the offset and the window never matched. The zone
 *     here is pinned to America/New_York (helpers/e2e-global-setup.ts), so these
 *     assertions fail against that bug and hold with `createdAt` set explicitly.
 *
 *  2. **The reset writes commit together.** The new password and the token's
 *     `usedAt` share one transaction; what a caller can observe afterwards — new
 *     password works, old one does not, link is spent — is asserted end to end.
 *
 * The mailer is overridden to capture the link, because the plaintext token
 * exists nowhere else: the row holds only sha256 of it, by design.
 */
describe('Password Reset (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  /** Every link the service handed to the mailer, in order. */
  const sentLinks: string[] = [];
  const mailerStub = {
    sendPasswordResetEmail: jest.fn(
      ({ resetLink }: { resetLink: string }): Promise<void> => {
        sentLinks.push(resetLink);
        return Promise.resolve();
      },
    ),
  };

  const userId = uuidv4();
  const email = `reset-${uuidv4()}@test.local`;
  const originalPassword = 'original-password-1';

  const THROTTLE_MINUTES = 15;

  function tokenOf(link: string): string {
    return link.split('/').pop() as string;
  }

  /** Rows for the fixture user, oldest first. */
  async function tokenRows(): Promise<
    { id: string; createdAt: Date; usedAt: Date | null }[]
  > {
    return dataSource.query(
      `SELECT id, "createdAt", "usedAt" FROM password_reset_tokens
        WHERE "userId" = $1 ORDER BY "createdAt" ASC`,
      [userId],
    );
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PasswordResetMailer)
      .useValue(mailerStub)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await listenOnEphemeralPort(app);

    dataSource = moduleFixture.get(DataSource);

    await dataSource.query(
      `INSERT INTO users (id, email, name, "passwordHash", status, "createdAt")
       VALUES ($1, $2, 'Reset Fixture', $3, 'active', NOW())`,
      [userId, email, await bcrypt.hash(originalPassword, 10)],
    );
  }, 30000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        `DELETE FROM password_reset_tokens WHERE "userId" = $1`,
        [userId],
      );
      await dataSource.query(`DELETE FROM users WHERE id = $1`, [userId]);
    }
    if (app) await app.close();
  }, 30000);

  describe('the per-email throttle', () => {
    it('stamps createdAt on the app clock, not the database clock', async () => {
      const before = Date.now();

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(200);

      const rows = await tokenRows();
      expect(rows).toHaveLength(1);

      // Read back through the same driver the throttle's comparison uses. A
      // value written by the database clock and read on a non-UTC local
      // calendar lands a whole UTC offset away — hours, not the seconds a
      // round-trip costs.
      const drift = new Date(rows[0].createdAt).getTime() - before;
      expect(Math.abs(drift)).toBeLessThan(60_000);
    });

    it('mints nothing and sends nothing on a second request inside the window', async () => {
      const sentBefore = sentLinks.length;

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(200);

      // Still one row, still one mail: the response is deliberately identical
      // either way, so the rows are the only place the throttle is visible.
      expect(await tokenRows()).toHaveLength(1);
      expect(sentLinks.length).toBe(sentBefore);
    });

    it('mints again once the window has passed', async () => {
      const [row] = await tokenRows();
      const sentBefore = sentLinks.length;

      // Age the row past the window rather than waiting 15 minutes. The
      // interval arithmetic runs in the database on the stored value, so it
      // cannot paper over a zone mismatch the way a fresh JS timestamp would.
      await dataSource.query(
        `UPDATE password_reset_tokens
            SET "createdAt" = "createdAt" - INTERVAL '${THROTTLE_MINUTES + 1} minutes'
          WHERE id = $1`,
        [row.id],
      );

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(200);

      expect(await tokenRows()).toHaveLength(2);
      expect(sentLinks.length).toBe(sentBefore + 1);
    });

    it('mints nothing for an address with no account', async () => {
      const sentBefore = sentLinks.length;

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: `nobody-${uuidv4()}@test.local` })
        .expect(200);

      expect(sentLinks.length).toBe(sentBefore);
    });
  });

  describe('spending the link', () => {
    const newPassword = 'replacement-password-2';

    it('validates, resets, signs in, and cannot be replayed', async () => {
      const token = tokenOf(sentLinks[sentLinks.length - 1]);

      await request(app.getHttpServer())
        .get(`/api/auth/reset-password/${token}/validate`)
        .expect(200)
        .expect((res) => expect(res.body.valid).toBe(true));

      const reset = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token, password: newPassword })
        .expect(200);
      expect(typeof reset.body.accessToken).toBe('string');

      // Both transactional writes are visible together: the new password is
      // live and the link is spent. Neither half alone is a valid state.
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: newPassword })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: originalPassword })
        .expect(401);

      await request(app.getHttpServer())
        .get(`/api/auth/reset-password/${token}/validate`)
        .expect(200)
        .expect((res) => expect(res.body.valid).toBe(false));

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token, password: 'third-password-3' })
        .expect(400);
    });

    it('leaves the older unused token alone', async () => {
      // Spending one link is not a mass revocation: nothing in the spec says
      // the other outstanding row should be invalidated, so this pins the
      // behaviour rather than assuming it.
      const rows = await tokenRows();
      expect(rows.filter((r) => r.usedAt !== null)).toHaveLength(1);
      expect(rows.filter((r) => r.usedAt === null)).toHaveLength(1);
    });

    it('rejects an unknown token with the same message as a spent one', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: 'a'.repeat(43), password: 'whatever-password-4' })
        .expect(400);

      expect(JSON.stringify(res.body)).toContain('no longer valid');
    });
  });
});
