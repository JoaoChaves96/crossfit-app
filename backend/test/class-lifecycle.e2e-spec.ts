import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { generateTestToken } from './helpers/jwt.helper';

/**
 * Class Lifecycle & Gym Configuration Integration Tests
 *
 * Covers:
 *   PATCH  /api/gyms/:gymId/classes/:classId              (edit class)
 *   DELETE /api/gyms/:gymId/classes/:classId              (delete class)
 *   POST   /api/gyms/:gymId/classes/:classId/transition   (manual state transition)
 *   GET    /api/gyms/:gymId/configuration/spaces          (list spaces)
 *   GET    /api/gyms/:gymId/configuration/class-types     (list class types)
 *   GET    /api/gyms/:gymId/members                       (list members)
 *
 * Auth: Bearer JWT (generateTestToken)
 * Role enforcement: RolesGuard checks gym_staff for the required role
 *
 * ─── State machine (unidirectional) ────────────────────────────────────────────
 * published → booking_closed → in_progress → completed → archived
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe('Class Lifecycle & Gym Configuration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource | undefined;

  // Primary gym context
  const gymId = uuidv4();
  const ownerUserId = uuidv4();
  const coachUserId = uuidv4();
  const athleteUserId = uuidv4();
  const spaceId = uuidv4();
  const classTypeId = uuidv4();

  // Second gym for cross-gym mismatch tests
  const otherGymId = uuidv4();
  const otherOwnerUserId = uuidv4();

  // Tokens
  const ownerToken = generateTestToken({
    id: ownerUserId,
    email: `owner-lifecycle@test.local`,
    gymId,
    role: 'owner',
  });
  const coachToken = generateTestToken({
    id: coachUserId,
    email: `coach-lifecycle@test.local`,
    gymId,
    role: 'coach',
  });
  const athleteToken = generateTestToken({
    id: athleteUserId,
    email: `athlete-lifecycle@test.local`,
    gymId,
    role: 'athlete',
  });
  const otherOwnerToken = generateTestToken({
    id: otherOwnerUserId,
    email: `other-owner-lifecycle@test.local`,
    gymId: otherGymId,
    role: 'owner',
  });
  // Owner token scoped to the wrong gym — triggers the gymId path mismatch
  const ownerWithOtherGymToken = generateTestToken({
    id: ownerUserId,
    email: `owner-lifecycle@test.local`,
    gymId: otherGymId,
    role: 'owner',
  });

  // ─── Setup / Teardown ────────────────────────────────────────────────────────

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

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

    // Users
    await dataSource.query(
      `INSERT INTO users (id, email, name, status, "createdAt") VALUES
        ($1, $2, 'Lifecycle Owner',    'active', NOW()),
        ($3, $4, 'Lifecycle Coach',    'active', NOW()),
        ($5, $6, 'Lifecycle Athlete',  'active', NOW()),
        ($7, $8, 'Other Gym Owner',    'active', NOW())`,
      [
        ownerUserId,
        `lifecycle-owner-${uuidv4()}@test.local`,
        coachUserId,
        `lifecycle-coach-${uuidv4()}@test.local`,
        athleteUserId,
        `lifecycle-athlete-${uuidv4()}@test.local`,
        otherOwnerUserId,
        `lifecycle-other-owner-${uuidv4()}@test.local`,
      ],
    );

    // Gyms
    await dataSource.query(
      `INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
       VALUES
         ($1, 'Lifecycle Gym',       'desc', 'Lisbon', $2, 'active', NOW(), NOW()),
         ($3, 'Other Lifecycle Gym', 'desc', 'Porto',  $4, 'active', NOW(), NOW())`,
      [gymId, ownerUserId, otherGymId, otherOwnerUserId],
    );

    // gym_staff
    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt") VALUES
        ($1, $2, $3, 'owner',   'active', NOW()),
        ($4, $5, $6, 'coach',   'active', NOW()),
        ($7, $8, $9, 'owner',   'active', NOW())`,
      [
        uuidv4(), gymId,      ownerUserId,
        uuidv4(), gymId,      coachUserId,
        uuidv4(), otherGymId, otherOwnerUserId,
      ],
    );

    // gym_memberships — athlete in the primary gym
    await dataSource.query(
      `INSERT INTO gym_memberships (id, "gymId", "userId", status, "joinedAt")
       VALUES ($1, $2, $3, 'active', NOW())`,
      [uuidv4(), gymId, athleteUserId],
    );

    // Space in primary gym
    await dataSource.query(
      `INSERT INTO spaces (id, "gymId", name, "baseCapacity")
       VALUES ($1, $2, 'Config Space', 20)`,
      [spaceId, gymId],
    );

    // Class type in primary gym
    await dataSource.query(
      `INSERT INTO class_types (id, "gymId", name, "resultMetrics", loggable)
       VALUES ($1, $2, 'Config WOD', 'none', false)`,
      [classTypeId, gymId],
    );
  }

  async function cleanupTestData() {
    if (!dataSource) return;
    try {
      await dataSource.query(`DELETE FROM classes WHERE "gymId" IN ($1, $2)`, [gymId, otherGymId]);
      await dataSource.query(`DELETE FROM class_types WHERE "gymId" IN ($1, $2)`, [gymId, otherGymId]);
      await dataSource.query(`DELETE FROM spaces WHERE "gymId" IN ($1, $2)`, [gymId, otherGymId]);
      await dataSource.query(`DELETE FROM gym_memberships WHERE "gymId" IN ($1, $2)`, [gymId, otherGymId]);
      await dataSource.query(`DELETE FROM gym_staff WHERE "gymId" IN ($1, $2)`, [gymId, otherGymId]);
      await dataSource.query(`DELETE FROM gyms WHERE id IN ($1, $2)`, [gymId, otherGymId]);
      await dataSource.query(`DELETE FROM users WHERE id IN ($1, $2, $3, $4)`, [
        ownerUserId, coachUserId, athleteUserId, otherOwnerUserId,
      ]);
    } catch {
      // silently ignore cleanup errors
    }
  }

  function futureDateString(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  }

  /** Helper: create a published class belonging to coachUserId */
  async function createPublishedClass(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`/api/gyms/${gymId}/classes`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        classTypeId,
        coachUserId,
        spaceId,
        scheduledDate: futureDateString(),
        scheduledTime: '09:00',
        capacity: 15,
      })
      .expect(201);

    return (res.body as Record<string, unknown>).id as string;
  }

  /** Helper: transition a class to the requested state by stepping through each intermediate state */
  async function transitionTo(
    classId: string,
    targetState: 'booking_closed' | 'in_progress' | 'completed' | 'archived',
  ): Promise<void> {
    const sequence: Array<'booking_closed' | 'in_progress' | 'completed' | 'archived'> =
      ['booking_closed', 'in_progress', 'completed', 'archived'];

    const upTo = sequence.indexOf(targetState);
    for (let i = 0; i <= upTo; i++) {
      await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/classes/${classId}/transition`)
        .set('Authorization', `Bearer ${coachToken}`)
        .send({ classId, targetState: sequence[i] })
        .expect(201);
    }
  }

  // ─── PATCH /api/gyms/:gymId/classes/:classId ─────────────────────────────────

  describe('PATCH /api/gyms/:gymId/classes/:classId — edit class', () => {
    describe('happy path', () => {
      it('200 — owner can edit a published class', async () => {
        const classId = await createPublishedClass();

        const res = await request(app.getHttpServer())
          .patch(`/api/gyms/${gymId}/classes/${classId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ scheduledTime: '10:00' })
          .expect(200);

        const body = res.body as Record<string, unknown>;
        expect(body).toHaveProperty('id', classId);
        expect(body).toHaveProperty('scheduledTime', '10:00');
        expect(body).toHaveProperty('state', 'published');
      });
    });

    describe('no auth token', () => {
      it('401 — request without Authorization header', async () => {
        const classId = await createPublishedClass();

        await request(app.getHttpServer())
          .patch(`/api/gyms/${gymId}/classes/${classId}`)
          .send({ scheduledTime: '10:00' })
          .expect(401);
      });
    });

    describe('wrong role', () => {
      it('403 — athlete cannot edit a class', async () => {
        const classId = await createPublishedClass();

        await request(app.getHttpServer())
          .patch(`/api/gyms/${gymId}/classes/${classId}`)
          .set('Authorization', `Bearer ${athleteToken}`)
          .send({ scheduledTime: '10:00' })
          .expect(403);
      });

      it('403 — owner of another gym cannot edit a class in this gym', async () => {
        const classId = await createPublishedClass();

        await request(app.getHttpServer())
          .patch(`/api/gyms/${gymId}/classes/${classId}`)
          .set('Authorization', `Bearer ${otherOwnerToken}`)
          .send({ scheduledTime: '10:00' })
          .expect(403);
      });
    });

    describe('gymId mismatch', () => {
      it('500 — gymId in path does not match gym context in token', async () => {
        const classId = await createPublishedClass();

        await request(app.getHttpServer())
          .patch(`/api/gyms/${gymId}/classes/${classId}`)
          .set('Authorization', `Bearer ${ownerWithOtherGymToken}`)
          .send({ scheduledTime: '10:00' })
          .expect(500);
      });
    });

    describe('state guard violations', () => {
      it('400 — cannot edit a class that is not in published state', async () => {
        const classId = await createPublishedClass();
        await transitionTo(classId, 'booking_closed');

        await request(app.getHttpServer())
          .patch(`/api/gyms/${gymId}/classes/${classId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ scheduledTime: '11:00' })
          .expect(400);
      });
    });

    describe('not found', () => {
      it('404 — non-existent classId', async () => {
        await request(app.getHttpServer())
          .patch(`/api/gyms/${gymId}/classes/${uuidv4()}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ scheduledTime: '11:00' })
          .expect(404);
      });
    });
  });

  // ─── DELETE /api/gyms/:gymId/classes/:classId ─────────────────────────────────

  describe('DELETE /api/gyms/:gymId/classes/:classId — delete class', () => {
    describe('happy path', () => {
      it('200 — owner can soft-delete a published class', async () => {
        const classId = await createPublishedClass();

        const res = await request(app.getHttpServer())
          .delete(`/api/gyms/${gymId}/classes/${classId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        const body = res.body as Record<string, unknown>;
        expect(body).toHaveProperty('id', classId);
        expect(body).toHaveProperty('deletedAt');
        expect(typeof body.deletedAt).toBe('string');
        expect(new Date(body.deletedAt as string).getTime()).not.toBeNaN();
      });
    });

    describe('no auth token', () => {
      it('401 — request without Authorization header', async () => {
        const classId = await createPublishedClass();

        await request(app.getHttpServer())
          .delete(`/api/gyms/${gymId}/classes/${classId}`)
          .expect(401);
      });
    });

    describe('wrong role', () => {
      it('403 — athlete cannot delete a class', async () => {
        const classId = await createPublishedClass();

        await request(app.getHttpServer())
          .delete(`/api/gyms/${gymId}/classes/${classId}`)
          .set('Authorization', `Bearer ${athleteToken}`)
          .expect(403);
      });

      it('403 — owner of another gym cannot delete a class in this gym', async () => {
        const classId = await createPublishedClass();

        await request(app.getHttpServer())
          .delete(`/api/gyms/${gymId}/classes/${classId}`)
          .set('Authorization', `Bearer ${otherOwnerToken}`)
          .expect(403);
      });
    });

    describe('gymId mismatch', () => {
      it('500 — gymId in path does not match gym context in token', async () => {
        const classId = await createPublishedClass();

        await request(app.getHttpServer())
          .delete(`/api/gyms/${gymId}/classes/${classId}`)
          .set('Authorization', `Bearer ${ownerWithOtherGymToken}`)
          .expect(500);
      });
    });

    describe('state guard violations', () => {
      it('400 — cannot delete a class that is not in published state', async () => {
        const classId = await createPublishedClass();
        await transitionTo(classId, 'booking_closed');

        await request(app.getHttpServer())
          .delete(`/api/gyms/${gymId}/classes/${classId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(400);
      });
    });

    describe('not found', () => {
      it('404 — non-existent classId', async () => {
        await request(app.getHttpServer())
          .delete(`/api/gyms/${gymId}/classes/${uuidv4()}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(404);
      });
    });
  });

  // ─── POST /api/gyms/:gymId/classes/:classId/transition ───────────────────────

  describe('POST /api/gyms/:gymId/classes/:classId/transition — manual state transition', () => {
    describe('happy path', () => {
      it('201 — coach can transition published → booking_closed', async () => {
        const classId = await createPublishedClass();

        const res = await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/classes/${classId}/transition`)
          .set('Authorization', `Bearer ${coachToken}`)
          .send({ classId, targetState: 'booking_closed' })
          .expect(201);

        const body = res.body as Record<string, unknown>;
        expect(body).toHaveProperty('id', classId);
        expect(body).toHaveProperty('state', 'booking_closed');
      });

      it('201 — coach can advance through all states sequentially', async () => {
        const classId = await createPublishedClass();
        const stateSequence: Array<'booking_closed' | 'in_progress' | 'completed' | 'archived'> =
          ['booking_closed', 'in_progress', 'completed', 'archived'];

        for (const targetState of stateSequence) {
          const res = await request(app.getHttpServer())
            .post(`/api/gyms/${gymId}/classes/${classId}/transition`)
            .set('Authorization', `Bearer ${coachToken}`)
            .send({ classId, targetState })
            .expect(201);

          const body = res.body as Record<string, unknown>;
          expect(body).toHaveProperty('state', targetState);
        }
      });

      it('201 — owner can transition a class', async () => {
        const classId = await createPublishedClass();

        // The transition handler checks coachUserId === command.userId.
        // An owner is not the assigned coach, so this test verifies the
        // actual handler behavior. If it rejects owners it will FAIL here,
        // exposing the discrepancy between the API contract and the implementation.
        const res = await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/classes/${classId}/transition`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ classId, targetState: 'booking_closed' })
          .expect(201);

        const body = res.body as Record<string, unknown>;
        expect(body).toHaveProperty('state', 'booking_closed');
      });
    });

    describe('no auth token', () => {
      it('401 — request without Authorization header', async () => {
        const classId = await createPublishedClass();

        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/classes/${classId}/transition`)
          .send({ classId, targetState: 'booking_closed' })
          .expect(401);
      });
    });

    describe('wrong role', () => {
      it('403 — athlete cannot transition a class', async () => {
        const classId = await createPublishedClass();

        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/classes/${classId}/transition`)
          .set('Authorization', `Bearer ${athleteToken}`)
          .send({ classId, targetState: 'booking_closed' })
          .expect(403);
      });

      it('403 — owner of another gym cannot transition a class in this gym', async () => {
        const classId = await createPublishedClass();

        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/classes/${classId}/transition`)
          .set('Authorization', `Bearer ${otherOwnerToken}`)
          .send({ classId, targetState: 'booking_closed' })
          .expect(403);
      });
    });

    describe('gymId mismatch', () => {
      it('500 — gymId in path does not match gym context in token', async () => {
        const classId = await createPublishedClass();

        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/classes/${classId}/transition`)
          .set('Authorization', `Bearer ${ownerWithOtherGymToken}`)
          .send({ classId, targetState: 'booking_closed' })
          .expect(500);
      });
    });

    describe('state guard violations', () => {
      it('400 — cannot skip a state (published → in_progress)', async () => {
        const classId = await createPublishedClass();

        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/classes/${classId}/transition`)
          .set('Authorization', `Bearer ${coachToken}`)
          .send({ classId, targetState: 'in_progress' })
          .expect(400);
      });

      it('400 — cannot go backwards (in_progress → published)', async () => {
        const classId = await createPublishedClass();
        await transitionTo(classId, 'in_progress');

        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/classes/${classId}/transition`)
          .set('Authorization', `Bearer ${coachToken}`)
          .send({ classId, targetState: 'published' })
          .expect(400);
      });

      it('400 — cannot repeat same state (booking_closed → booking_closed)', async () => {
        const classId = await createPublishedClass();
        await transitionTo(classId, 'booking_closed');

        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/classes/${classId}/transition`)
          .set('Authorization', `Bearer ${coachToken}`)
          .send({ classId, targetState: 'booking_closed' })
          .expect(400);
      });
    });

    describe('validation errors', () => {
      it('400 — invalid targetState value', async () => {
        const classId = await createPublishedClass();

        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/classes/${classId}/transition`)
          .set('Authorization', `Bearer ${coachToken}`)
          .send({ classId, targetState: 'cancelled' })
          .expect(400);
      });
    });

    describe('not found', () => {
      it('404 — non-existent classId', async () => {
        const nonExistentClassId = uuidv4();

        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/classes/${nonExistentClassId}/transition`)
          .set('Authorization', `Bearer ${coachToken}`)
          .send({ classId: nonExistentClassId, targetState: 'booking_closed' })
          .expect(404);
      });
    });
  });

  // ─── GET /api/gyms/:gymId/configuration/spaces ───────────────────────────────

  describe('GET /api/gyms/:gymId/configuration/spaces — list spaces', () => {
    describe('happy path', () => {
      it('200 — owner gets list of spaces', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/gyms/${gymId}/configuration/spaces`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        const body = res.body as Record<string, unknown>;
        expect(body).toHaveProperty('spaces');
        expect(Array.isArray(body.spaces)).toBe(true);

        const spaces = body.spaces as Array<Record<string, unknown>>;
        const found = spaces.find((s) => s.id === spaceId);
        expect(found).toBeDefined();
        expect(found).toHaveProperty('name', 'Config Space');
        expect(found).toHaveProperty('baseCapacity', 20);
      });
    });

    describe('no auth token', () => {
      it('401 — request without Authorization header', async () => {
        await request(app.getHttpServer())
          .get(`/api/gyms/${gymId}/configuration/spaces`)
          .expect(401);
      });
    });

    describe('wrong role', () => {
      it('403 — athlete cannot list spaces', async () => {
        await request(app.getHttpServer())
          .get(`/api/gyms/${gymId}/configuration/spaces`)
          .set('Authorization', `Bearer ${athleteToken}`)
          .expect(403);
      });

      it('403 — owner of another gym cannot list spaces in this gym', async () => {
        await request(app.getHttpServer())
          .get(`/api/gyms/${gymId}/configuration/spaces`)
          .set('Authorization', `Bearer ${otherOwnerToken}`)
          .expect(403);
      });
    });

    describe('gymId mismatch', () => {
      it('500 — gymId in path does not match gym context in token', async () => {
        await request(app.getHttpServer())
          .get(`/api/gyms/${gymId}/configuration/spaces`)
          .set('Authorization', `Bearer ${ownerWithOtherGymToken}`)
          .expect(500);
      });
    });
  });

  // ─── GET /api/gyms/:gymId/configuration/class-types ─────────────────────────

  describe('GET /api/gyms/:gymId/configuration/class-types — list class types', () => {
    describe('happy path', () => {
      it('200 — owner gets list of class types', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/gyms/${gymId}/configuration/class-types`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        const body = res.body as Record<string, unknown>;
        expect(body).toHaveProperty('classTypes');
        expect(Array.isArray(body.classTypes)).toBe(true);

        const classTypes = body.classTypes as Array<Record<string, unknown>>;
        const found = classTypes.find((ct) => ct.id === classTypeId);
        expect(found).toBeDefined();
        expect(found).toHaveProperty('name', 'Config WOD');
        expect(found).toHaveProperty('gymId', gymId);
      });
    });

    describe('no auth token', () => {
      it('401 — request without Authorization header', async () => {
        await request(app.getHttpServer())
          .get(`/api/gyms/${gymId}/configuration/class-types`)
          .expect(401);
      });
    });

    describe('wrong role', () => {
      it('403 — athlete cannot list class types', async () => {
        await request(app.getHttpServer())
          .get(`/api/gyms/${gymId}/configuration/class-types`)
          .set('Authorization', `Bearer ${athleteToken}`)
          .expect(403);
      });

      it('403 — owner of another gym cannot list class types in this gym', async () => {
        await request(app.getHttpServer())
          .get(`/api/gyms/${gymId}/configuration/class-types`)
          .set('Authorization', `Bearer ${otherOwnerToken}`)
          .expect(403);
      });
    });

    describe('gymId mismatch', () => {
      it('500 — gymId in path does not match gym context in token', async () => {
        await request(app.getHttpServer())
          .get(`/api/gyms/${gymId}/configuration/class-types`)
          .set('Authorization', `Bearer ${ownerWithOtherGymToken}`)
          .expect(500);
      });
    });
  });

  // ─── GET /api/gyms/:gymId/members ────────────────────────────────────────────

  describe('GET /api/gyms/:gymId/members — list gym members', () => {
    describe('happy path', () => {
      it('200 — owner gets list of active members', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/gyms/${gymId}/members`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        const body = res.body as Record<string, unknown>;
        expect(body).toHaveProperty('members');
        expect(Array.isArray(body.members)).toBe(true);

        const members = body.members as Array<Record<string, unknown>>;
        const found = members.find((m) => m.userId === athleteUserId);
        expect(found).toBeDefined();
      });
    });

    describe('no auth token', () => {
      it('401 — request without Authorization header', async () => {
        await request(app.getHttpServer())
          .get(`/api/gyms/${gymId}/members`)
          .expect(401);
      });
    });

    describe('wrong role', () => {
      it('403 — athlete cannot list gym members', async () => {
        await request(app.getHttpServer())
          .get(`/api/gyms/${gymId}/members`)
          .set('Authorization', `Bearer ${athleteToken}`)
          .expect(403);
      });

      it('403 — coach cannot list gym members', async () => {
        await request(app.getHttpServer())
          .get(`/api/gyms/${gymId}/members`)
          .set('Authorization', `Bearer ${coachToken}`)
          .expect(403);
      });

      it('403 — owner of another gym cannot list members in this gym', async () => {
        await request(app.getHttpServer())
          .get(`/api/gyms/${gymId}/members`)
          .set('Authorization', `Bearer ${otherOwnerToken}`)
          .expect(403);
      });
    });

    describe('gymId mismatch', () => {
      it('500 — gymId in path does not match gym context in token', async () => {
        await request(app.getHttpServer())
          .get(`/api/gyms/${gymId}/members`)
          .set('Authorization', `Bearer ${ownerWithOtherGymToken}`)
          .expect(500);
      });
    });
  });
});
