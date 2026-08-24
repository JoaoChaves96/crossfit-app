import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PasswordChangedMailer } from '../src/infrastructure/mail/password-changed-mailer';
import { listenOnEphemeralPort } from './helpers/listen';

/**
 * Change password E2E — POST /api/auth/change-password.
 *
 * password-change.service.spec.ts already covers the branches against mocked
 * repositories. This suite is here for the three things only a real app and a
 * real database can show:
 *
 *  1. **The write lands and the old password stops working.** A mocked
 *     `update` proves the call, not the row.
 *  2. **A session issued before the change still works.** That is the accepted
 *     limit (no revocation) rather than an assumption — asserted, so that adding
 *     revocation later has to change a test that says so out loud.
 *  3. **The route is scoped by the token, not the body.** Two fixture users
 *     exist; A's request cannot touch B, and there is no field in the DTO with
 *     which to try.
 */
describe('Change Password (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  /** Every address the service notified, in order. */
  const notified: string[] = [];
  const mailerStub = {
    sendPasswordChangedEmail: jest.fn(
      ({ email }: { email: string }): Promise<void> => {
        notified.push(email);
        return Promise.resolve();
      },
    ),
  };

  const userAId = uuidv4();
  const userBId = uuidv4();
  const emailA = `change-a-${uuidv4()}@test.local`;
  const emailB = `change-b-${uuidv4()}@test.local`;
  const originalPassword = 'original-password-1';
  const newPassword = 'replacement-password-2';

  /** A token minted before any change, kept to prove it stays valid. */
  let preChangeToken: string;

  async function login(email: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body.accessToken as string;
  }

  async function hashOf(userId: string): Promise<string> {
    const rows: { passwordHash: string }[] = await dataSource.query(
      `SELECT "passwordHash" FROM users WHERE id = $1`,
      [userId],
    );
    return rows[0].passwordHash;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PasswordChangedMailer)
      .useValue(mailerStub)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await listenOnEphemeralPort(app);

    dataSource = moduleFixture.get(DataSource);

    const passwordHash = await bcrypt.hash(originalPassword, 10);
    await dataSource.query(
      `INSERT INTO users (id, email, name, "passwordHash", status, "createdAt")
       VALUES ($1, $2, 'Change Fixture A', $4, 'active', NOW()),
              ($3, $5, 'Change Fixture B', $4, 'active', NOW())`,
      [userAId, emailA, userBId, passwordHash, emailB],
    );

    preChangeToken = await login(emailA, originalPassword);
  }, 30000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(`DELETE FROM users WHERE id = ANY($1)`, [
        [userAId, userBId],
      ]);
    }
    if (app) await app.close();
  }, 30000);

  describe('rejections write nothing', () => {
    it('401s without a token — the one thing that is an auth failure', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .send({ currentPassword: originalPassword, newPassword })
        .expect(401);
    });

    it('400s on a wrong current password, not 401: the session is valid', async () => {
      const before = await hashOf(userAId);

      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${preChangeToken}`)
        .send({ currentPassword: 'not-the-password', newPassword })
        .expect(400);

      expect(await hashOf(userAId)).toBe(before);
    });

    it('400s when the new password equals the current one', async () => {
      const before = await hashOf(userAId);

      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${preChangeToken}`)
        .send({
          currentPassword: originalPassword,
          newPassword: originalPassword,
        })
        .expect(400);

      expect(await hashOf(userAId)).toBe(before);
    });

    it('400s on a missing field', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${preChangeToken}`)
        .send({ currentPassword: originalPassword })
        .expect(400);
    });
  });

  describe('a successful change', () => {
    it('returns 200 with an empty body and no new token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${preChangeToken}`)
        .send({ currentPassword: originalPassword, newPassword })
        .expect(200);

      expect(res.body).toEqual({});
      expect(res.body.accessToken).toBeUndefined();
    });

    it('stores a bcrypt hash of the new password, never the plaintext', async () => {
      const stored = await hashOf(userAId);
      expect(stored).not.toBe(newPassword);
      await expect(bcrypt.compare(newPassword, stored)).resolves.toBe(true);
    });

    it('lets the new password sign in and stops the old one', async () => {
      await login(emailA, newPassword);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: emailA, password: originalPassword })
        .expect(401);
    });

    it('notified the account holder, and nobody else', async () => {
      expect(notified).toEqual([emailA]);
    });

    // The accepted limit, asserted rather than assumed: a change revokes
    // nothing, which is exactly why the notification email exists. The proof is
    // the pre-change token driving a second authenticated change — this route
    // needs only a valid JWT, so a 200 here is the token still being honoured.
    it('leaves the session issued before the change working', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${preChangeToken}`)
        .send({
          currentPassword: newPassword,
          newPassword: 'third-password-3',
        })
        .expect(200);

      await login(emailA, 'third-password-3');
      expect(notified).toEqual([emailA, emailA]);
    });

    it('touched only the caller from the token', async () => {
      await expect(
        bcrypt.compare(originalPassword, await hashOf(userBId)),
      ).resolves.toBe(true);
    });
  });
});
