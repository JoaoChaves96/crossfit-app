import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { generateTestToken } from './helpers/jwt.helper';
import { listenOnEphemeralPort } from './helpers/listen';

/**
 * Gym Suspension E2E — a non-active gym is frozen read-only
 *
 * Auth: signed JWT — `sub` (actor), `gymId` (gym context), `role`
 *
 * The rule (docs/DECISIONS.md → *Gym Suspension Is A Read-Only Freeze*): while a
 * gym's status is not `active`, everyone keeps their reads and nobody — the owner
 * included — may mutate. Enforced by GymStatusGuard on every `:gymId` route, and
 * by InviteService for the one gym-scoped mutation that has no `:gymId` to key
 * on.
 *
 * Suspension is set here with UPDATE rather than through the API on purpose:
 * nothing transitions a gym into `suspended` in MVP (docs/DECISIONS.md →
 * *Auto-Approve Gym Registration*; the platform-admin surface is Phase 2). The
 * enforcement is what ships now, so the state is reached the only way it can be.
 *
 * Two gyms exist here for one reason: to prove the freeze is scoped to the
 * suspended gym and does not leak to an active one.
 */
describe('Gym Suspension — read-only freeze (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource | undefined;

  const suspendedGymId = uuidv4();
  const activeGymId = uuidv4();
  const ownerUserId = uuidv4();
  const activeOwnerUserId = uuidv4();
  const athleteUserId = uuidv4();

  const ownerToken = generateTestToken({
    id: ownerUserId,
    email: 'owner@suspension.test',
    gymId: suspendedGymId,
    role: 'owner',
  });
  const activeOwnerToken = generateTestToken({
    id: activeOwnerUserId,
    email: 'active-owner@suspension.test',
    gymId: activeGymId,
    role: 'owner',
  });
  const athleteToken = generateTestToken({
    id: athleteUserId,
    email: 'athlete@suspension.test',
    gymId: suspendedGymId,
    role: 'athlete',
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await listenOnEphemeralPort(app);

    dataSource = moduleFixture.get(DataSource);

    if (dataSource && dataSource.isInitialized) {
      await setupTestData();
    }
  }, 30000);

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await cleanupTestData();
    }
    if (app) {
      await app.close();
    }
  }, 30000);

  async function setupTestData() {
    if (!dataSource) throw new Error('DataSource not initialized');

    await dataSource.query(
      `
      INSERT INTO users (id, email, name, status, "createdAt")
      VALUES
        ($1, $2, 'Suspended Gym Owner', 'active', NOW()),
        ($3, $4, 'Active Gym Owner',    'active', NOW()),
        ($5, $6, 'Athlete User',        'active', NOW())
      `,
      [
        ownerUserId,
        `owner-${uuidv4()}@test.local`,
        activeOwnerUserId,
        `active-owner-${uuidv4()}@test.local`,
        athleteUserId,
        `athlete-${uuidv4()}@test.local`,
      ],
    );

    // Both gyms start active — the suspension is applied per-test, so the same
    // request can be shown succeeding before it and failing after.
    await dataSource.query(
      `
      INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
      VALUES
        ($1, 'Frozen Box', 'desc', 'Lisbon', $2, 'active', NOW(), NOW()),
        ($3, 'Live Box',   'desc', 'Porto',  $4, 'active', NOW(), NOW())
      `,
      [suspendedGymId, ownerUserId, activeGymId, activeOwnerUserId],
    );

    await dataSource.query(
      `
      INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
      VALUES
        ($1, $2, $3, 'owner', 'active', NOW()),
        ($4, $5, $6, 'owner', 'active', NOW()),
        ($7, $8, $9, 'athlete', 'active', NOW())
      `,
      [
        uuidv4(),
        suspendedGymId,
        ownerUserId,
        uuidv4(),
        activeGymId,
        activeOwnerUserId,
        uuidv4(),
        suspendedGymId,
        athleteUserId,
      ],
    );
  }

  async function cleanupTestData() {
    if (!dataSource) return;

    try {
      await dataSource.query(
        `DELETE FROM spaces WHERE "gymId" IN ($1, $2)`,
        [suspendedGymId, activeGymId],
      );
      await dataSource.query(
        `DELETE FROM gym_staff WHERE "gymId" IN ($1, $2)`,
        [suspendedGymId, activeGymId],
      );
      await dataSource.query(`DELETE FROM gyms WHERE id IN ($1, $2)`, [
        suspendedGymId,
        activeGymId,
      ]);
      await dataSource.query(`DELETE FROM users WHERE id IN ($1, $2, $3)`, [
        ownerUserId,
        activeOwnerUserId,
        athleteUserId,
      ]);
    } catch {
      // silently ignore cleanup errors
    }
  }

  async function setGymStatus(
    gymId: string,
    status: 'active' | 'suspended' | 'pending_approval',
  ) {
    if (!dataSource) throw new Error('DataSource not initialized');
    await dataSource.query(`UPDATE gyms SET status = $1 WHERE id = $2`, [
      status,
      gymId,
    ]);
  }

  beforeEach(async () => {
    await setGymStatus(suspendedGymId, 'active');
    await setGymStatus(activeGymId, 'active');
  });

  it('accepts the mutation while the gym is active', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/gyms/${suspendedGymId}/configuration/spaces`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `Floor ${uuidv4().slice(0, 8)}`, baseCapacity: 10 });

    expect(res.status).toBe(201);
  });

  describe.each(['suspended', 'pending_approval'] as const)(
    'when the gym is %s',
    (status) => {
      beforeEach(async () => {
        await setGymStatus(suspendedGymId, status);
      });

      it("still answers the owner's reads", async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/gyms/${suspendedGymId}/configuration/spaces`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
      });

      it('refuses the same mutation the active gym accepted', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/gyms/${suspendedGymId}/configuration/spaces`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: `Floor ${uuidv4().slice(0, 8)}`, baseCapacity: 10 });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Gym is suspended');
      });

      it('refuses a PATCH to the gym profile', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/gyms/${suspendedGymId}/profile`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'Renamed While Frozen' });

        expect(res.status).toBe(403);
      });

      it('refuses an athlete booking', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/gyms/${suspendedGymId}/classes/${uuidv4()}/bookings`)
          .set('Authorization', `Bearer ${athleteToken}`)
          .send({ gymId: suspendedGymId, classId: uuidv4() });

        expect(res.status).toBe(403);
      });

      it('leaves an unrelated active gym untouched', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/gyms/${activeGymId}/configuration/spaces`)
          .set('Authorization', `Bearer ${activeOwnerToken}`)
          .send({ name: `Floor ${uuidv4().slice(0, 8)}`, baseCapacity: 10 });

        expect(res.status).toBe(201);
      });

      it('does not write anything it refused', async () => {
        const name = `Ghost Floor ${uuidv4().slice(0, 8)}`;

        await request(app.getHttpServer())
          .post(`/api/gyms/${suspendedGymId}/configuration/spaces`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name, baseCapacity: 10 });

        const rows = await dataSource!.query(
          `SELECT id FROM spaces WHERE "gymId" = $1 AND name = $2`,
          [suspendedGymId, name],
        );
        expect(rows).toHaveLength(0);
      });
    },
  );
});
