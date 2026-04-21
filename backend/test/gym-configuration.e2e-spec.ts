import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Gym Configuration E2E Tests — Spaces & Class Types
 *
 * Covers:
 *   POST   /api/gyms/:gymId/configuration/spaces
 *   PATCH  /api/gyms/:gymId/configuration/spaces/:spaceId
 *   DELETE /api/gyms/:gymId/configuration/spaces/:spaceId
 *   POST   /api/gyms/:gymId/configuration/class-types
 *
 * Auth: header-based (x-user-id, x-gym-id) — dev mode
 * Role enforcement: RolesGuard checks gym_staff for 'owner' role
 *
 * ─── API CONTRACT (for frontend) ──────────────────────────────────────────────
 *
 * POST /api/gyms/:gymId/configuration/spaces
 *   Auth: x-user-id (owner), x-gym-id (must match :gymId)
 *   Request body:
 *     { "name": string, "baseCapacity": number (integer >= 1) }
 *   201 Response:
 *     { "id": string, "gymId": string, "name": string, "baseCapacity": number, "deletedAt": null }
 *   Errors:
 *     400 — missing/invalid fields, duplicate name
 *     403 — user is not owner, or gymId mismatch
 *
 * PATCH /api/gyms/:gymId/configuration/spaces/:spaceId
 *   Auth: x-user-id (owner), x-gym-id (must match :gymId)
 *   Request body (all fields optional):
 *     { "name"?: string, "baseCapacity"?: number (integer >= 1) }
 *   200 Response:
 *     { "id": string, "gymId": string, "name": string, "baseCapacity": number, "deletedAt": null | string }
 *   Errors:
 *     400 — invalid field values, duplicate name
 *     403 — user is not owner, or gymId mismatch
 *     404 — space not found
 *
 * DELETE /api/gyms/:gymId/configuration/spaces/:spaceId
 *   Auth: x-user-id (owner), x-gym-id (must match :gymId)
 *   No request body
 *   200 Response:
 *     { "id": string, "gymId": string, "name": string, "baseCapacity": number, "deletedAt": string (ISO date) }
 *   Errors:
 *     400 — space has active classes assigned
 *     403 — user is not owner, or gymId mismatch
 *     404 — space not found
 *
 * POST /api/gyms/:gymId/configuration/class-types
 *   Auth: x-user-id (owner), x-gym-id (must match :gymId)
 *   Request body:
 *     {
 *       "operation": "create" | "update" | "delete",
 *       "classTypeId"?: string  (required for update/delete),
 *       "name"?: string         (required for create; optional for update),
 *       "loggable"?: boolean,
 *       "resultMetrics"?: "time" | "reps" | "weight" | "rounds" | "none"
 *     }
 *   201 Response:
 *     { "id": string, "gymId": string, "name": string, "loggable": boolean,
 *       "resultMetrics": string, "deletedAt": null | string }
 *   Errors:
 *     400 — invalid operation, missing required fields, duplicate name
 *     403 — user is not owner, or gymId mismatch
 *     404 — classType not found (update/delete)
 *
 * ──────────────────────────────────────────────────────────────────────────────
 */
describe('Gym Configuration — Spaces & Class Types (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource | undefined;

  // Gym owner context
  const gymId = uuidv4();
  const ownerUserId = uuidv4();

  // A second gym for cross-gym scoping tests
  const otherGymId = uuidv4();
  const otherOwnerUserId = uuidv4();

  // A non-owner user (athlete)
  const athleteUserId = uuidv4();

  // Tracked IDs for cleanup
  const createdSpaceIds: string[] = [];
  const createdClassTypeIds: string[] = [];

  // ─── Setup ──────────────────────────────────────────────────────────────────

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

    // Create users: owner, other-gym owner, athlete
    await dataSource.query(
      `
      INSERT INTO users (id, email, name, status, "createdAt")
      VALUES
        ($1, $2, 'Owner User',       'active', NOW()),
        ($3, $4, 'Other Owner User', 'active', NOW()),
        ($5, $6, 'Athlete User',     'active', NOW())
      `,
      [
        ownerUserId,
        `owner-${uuidv4()}@test.local`,
        otherOwnerUserId,
        `other-owner-${uuidv4()}@test.local`,
        athleteUserId,
        `athlete-${uuidv4()}@test.local`,
      ],
    );

    // Create two gyms
    await dataSource.query(
      `
      INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
      VALUES
        ($1, 'Test Gym',       'desc', 'Lisbon', $2, 'active', NOW(), NOW()),
        ($3, 'Other Test Gym', 'desc', 'Porto',  $4, 'active', NOW(), NOW())
      `,
      [gymId, ownerUserId, otherGymId, otherOwnerUserId],
    );

    // Create gym_staff rows so RolesGuard can verify ownership
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
        gymId,
        ownerUserId,
        uuidv4(),
        otherGymId,
        otherOwnerUserId,
        uuidv4(),
        gymId,
        athleteUserId,
      ],
    );
  }

  async function cleanupTestData() {
    if (!dataSource) return;

    try {
      if (createdSpaceIds.length > 0) {
        await dataSource.query(
          `DELETE FROM spaces WHERE id = ANY($1::uuid[])`,
          [createdSpaceIds],
        );
      }
      if (createdClassTypeIds.length > 0) {
        await dataSource.query(
          `DELETE FROM class_types WHERE id = ANY($1::uuid[])`,
          [createdClassTypeIds],
        );
      }
      await dataSource.query(`DELETE FROM gym_staff WHERE "gymId" IN ($1, $2)`, [gymId, otherGymId]);
      await dataSource.query(`DELETE FROM gyms WHERE id IN ($1, $2)`, [gymId, otherGymId]);
      await dataSource.query(`DELETE FROM users WHERE id IN ($1, $2, $3)`, [
        ownerUserId,
        otherOwnerUserId,
        athleteUserId,
      ]);
    } catch {
      // silently ignore cleanup errors
    }
  }

  // ─── POST /spaces ────────────────────────────────────────────────────────────

  describe('POST /api/gyms/:gymId/configuration/spaces', () => {
    describe('successful creation', () => {
      it('201 — creates a space with valid name and baseCapacity', async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/spaces`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ name: 'Main Box', baseCapacity: 20 })
          .expect(201);

        const body = response.body as Record<string, unknown>;
        expect(body).toHaveProperty('id');
        expect(typeof body.id).toBe('string');
        expect(body).toHaveProperty('gymId', gymId);
        expect(body).toHaveProperty('name', 'Main Box');
        expect(body).toHaveProperty('baseCapacity', 20);
        expect(body).toHaveProperty('deletedAt', null);

        createdSpaceIds.push(body.id as string);
      });
    });

    describe('validation errors', () => {
      it('400 — missing name', async () => {
        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/spaces`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ baseCapacity: 10 })
          .expect(400);
      });

      it('400 — missing baseCapacity', async () => {
        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/spaces`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ name: 'Room B' })
          .expect(400);
      });

      it('400 — baseCapacity of 0 is rejected', async () => {
        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/spaces`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ name: 'Zero Room', baseCapacity: 0 })
          .expect(400);
      });

      it('400 — duplicate space name in the same gym', async () => {
        // First creation succeeds
        const first = await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/spaces`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ name: 'Duplicate Space', baseCapacity: 5 })
          .expect(201);

        createdSpaceIds.push((first.body as Record<string, unknown>).id as string);

        // Second with same name must be rejected
        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/spaces`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ name: 'Duplicate Space', baseCapacity: 5 })
          .expect(400);
      });
    });

    describe('authorization', () => {
      it('403 — athlete cannot create a space', async () => {
        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/spaces`)
          .set('x-user-id', athleteUserId)
          .set('x-gym-id', gymId)
          .send({ name: 'Athlete Room', baseCapacity: 10 })
          .expect(403);
      });

      it('403 — owner of another gym cannot create a space in this gym', async () => {
        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/spaces`)
          .set('x-user-id', otherOwnerUserId)
          .set('x-gym-id', gymId)
          .send({ name: 'Intruder Room', baseCapacity: 10 })
          .expect(403);
      });

      it('500 — gymId in path does not match x-gym-id header (mismatch throws)', async () => {
        // The controller throws a plain Error('Gym ID mismatch') which results in 500
        // This is a known behavior (not HTTP-mapped). Documented for frontend.
        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/spaces`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', otherGymId)
          .send({ name: 'Mismatch Room', baseCapacity: 10 })
          .expect(500);
      });
    });
  });

  // ─── PATCH /spaces/:spaceId ─────────────────────────────────────────────────

  describe('PATCH /api/gyms/:gymId/configuration/spaces/:spaceId', () => {
    let spaceId: string;

    beforeAll(async () => {
      // Create a space to update
      const response = await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/configuration/spaces`)
        .set('x-user-id', ownerUserId)
        .set('x-gym-id', gymId)
        .send({ name: 'Update Target Space', baseCapacity: 15 })
        .expect(201);

      spaceId = (response.body as Record<string, unknown>).id as string;
      createdSpaceIds.push(spaceId);
    });

    describe('successful updates', () => {
      it('200 — update name only', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/gyms/${gymId}/configuration/spaces/${spaceId}`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ name: 'Renamed Space' })
          .expect(200);

        const body = response.body as Record<string, unknown>;
        expect(body).toHaveProperty('id', spaceId);
        expect(body).toHaveProperty('gymId', gymId);
        expect(body).toHaveProperty('name', 'Renamed Space');
        expect(body).toHaveProperty('baseCapacity', 15);
        expect(body).toHaveProperty('deletedAt');
      });

      it('200 — update baseCapacity only', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/gyms/${gymId}/configuration/spaces/${spaceId}`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ baseCapacity: 30 })
          .expect(200);

        const body = response.body as Record<string, unknown>;
        expect(body).toHaveProperty('baseCapacity', 30);
      });

      it('200 — update both name and baseCapacity', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/gyms/${gymId}/configuration/spaces/${spaceId}`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ name: 'Updated Space', baseCapacity: 25 })
          .expect(200);

        const body = response.body as Record<string, unknown>;
        expect(body).toHaveProperty('name', 'Updated Space');
        expect(body).toHaveProperty('baseCapacity', 25);
      });
    });

    describe('validation errors', () => {
      it('400 — baseCapacity of 0 is rejected', async () => {
        await request(app.getHttpServer())
          .patch(`/api/gyms/${gymId}/configuration/spaces/${spaceId}`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ baseCapacity: 0 })
          .expect(400);
      });
    });

    describe('not found', () => {
      it('404 — non-existent spaceId', async () => {
        await request(app.getHttpServer())
          .patch(`/api/gyms/${gymId}/configuration/spaces/${uuidv4()}`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ name: 'Ghost Space' })
          .expect(404);
      });
    });

    describe('authorization', () => {
      it('403 — athlete cannot update a space', async () => {
        await request(app.getHttpServer())
          .patch(`/api/gyms/${gymId}/configuration/spaces/${spaceId}`)
          .set('x-user-id', athleteUserId)
          .set('x-gym-id', gymId)
          .send({ name: 'Athlete Update' })
          .expect(403);
      });

      it('403 — owner of another gym cannot update a space in this gym', async () => {
        await request(app.getHttpServer())
          .patch(`/api/gyms/${gymId}/configuration/spaces/${spaceId}`)
          .set('x-user-id', otherOwnerUserId)
          .set('x-gym-id', gymId)
          .send({ name: 'Other Gym Update' })
          .expect(403);
      });

      it('500 — gymId path does not match x-gym-id header', async () => {
        await request(app.getHttpServer())
          .patch(`/api/gyms/${gymId}/configuration/spaces/${spaceId}`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', otherGymId)
          .send({ name: 'Mismatch Update' })
          .expect(500);
      });
    });
  });

  // ─── DELETE /spaces/:spaceId ────────────────────────────────────────────────

  describe('DELETE /api/gyms/:gymId/configuration/spaces/:spaceId', () => {
    let spaceId: string;

    beforeEach(async () => {
      // Create a fresh space for each test
      const response = await request(app.getHttpServer())
        .post(`/api/gyms/${gymId}/configuration/spaces`)
        .set('x-user-id', ownerUserId)
        .set('x-gym-id', gymId)
        .send({ name: `Delete Target ${uuidv4()}`, baseCapacity: 10 })
        .expect(201);

      spaceId = (response.body as Record<string, unknown>).id as string;
      createdSpaceIds.push(spaceId);
    });

    describe('successful deletion', () => {
      it('200 — soft-deletes the space; response includes deletedAt', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/api/gyms/${gymId}/configuration/spaces/${spaceId}`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .expect(200);

        const body = response.body as Record<string, unknown>;
        expect(body).toHaveProperty('id', spaceId);
        expect(body).toHaveProperty('gymId', gymId);
        expect(body).toHaveProperty('name');
        expect(body).toHaveProperty('baseCapacity');
        expect(body).toHaveProperty('deletedAt');
        expect(typeof body.deletedAt).toBe('string');
        expect(new Date(body.deletedAt as string).getTime()).not.toBeNaN();
      });
    });

    describe('not found', () => {
      it('404 — non-existent spaceId', async () => {
        await request(app.getHttpServer())
          .delete(`/api/gyms/${gymId}/configuration/spaces/${uuidv4()}`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .expect(404);
      });
    });

    describe('authorization', () => {
      it('403 — athlete cannot delete a space', async () => {
        await request(app.getHttpServer())
          .delete(`/api/gyms/${gymId}/configuration/spaces/${spaceId}`)
          .set('x-user-id', athleteUserId)
          .set('x-gym-id', gymId)
          .expect(403);
      });

      it('403 — owner of another gym cannot delete a space in this gym', async () => {
        await request(app.getHttpServer())
          .delete(`/api/gyms/${gymId}/configuration/spaces/${spaceId}`)
          .set('x-user-id', otherOwnerUserId)
          .set('x-gym-id', gymId)
          .expect(403);
      });

      it('500 — gymId path does not match x-gym-id header', async () => {
        await request(app.getHttpServer())
          .delete(`/api/gyms/${gymId}/configuration/spaces/${spaceId}`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', otherGymId)
          .expect(500);
      });
    });
  });

  // ─── POST /class-types ───────────────────────────────────────────────────────

  describe('POST /api/gyms/:gymId/configuration/class-types', () => {
    describe('operation: create', () => {
      it('201 — creates a class type with required fields only', async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ operation: 'create', name: 'CrossFit' })
          .expect(201);

        const body = response.body as Record<string, unknown>;
        expect(body).toHaveProperty('id');
        expect(typeof body.id).toBe('string');
        expect(body).toHaveProperty('gymId', gymId);
        expect(body).toHaveProperty('name', 'CrossFit');
        expect(body).toHaveProperty('loggable', false);
        expect(body).toHaveProperty('resultMetrics', 'none');
        expect(body).toHaveProperty('deletedAt', null);

        createdClassTypeIds.push(body.id as string);
      });

      it('201 — creates a class type with all optional fields', async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({
            operation: 'create',
            name: 'Weightlifting',
            loggable: true,
            resultMetrics: 'weight',
          })
          .expect(201);

        const body = response.body as Record<string, unknown>;
        expect(body).toHaveProperty('name', 'Weightlifting');
        expect(body).toHaveProperty('loggable', true);
        expect(body).toHaveProperty('resultMetrics', 'weight');

        createdClassTypeIds.push(body.id as string);
      });

      it('400 — create with no name field', async () => {
        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ operation: 'create' })
          .expect(400);
      });

      it('400 — duplicate class type name in the same gym', async () => {
        const name = `DupType-${uuidv4()}`;

        const first = await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ operation: 'create', name })
          .expect(201);

        createdClassTypeIds.push((first.body as Record<string, unknown>).id as string);

        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ operation: 'create', name })
          .expect(400);
      });

      it('400 — invalid resultMetrics value', async () => {
        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ operation: 'create', name: 'BadMetrics', resultMetrics: 'invalid' })
          .expect(400);
      });

      it('400 — invalid operation value', async () => {
        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ operation: 'unknown', name: 'Anything' })
          .expect(400);
      });
    });

    describe('operation: update', () => {
      let classTypeId: string;

      beforeAll(async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ operation: 'create', name: `UpdateTarget-${uuidv4()}`, loggable: false, resultMetrics: 'none' })
          .expect(201);

        classTypeId = (response.body as Record<string, unknown>).id as string;
        createdClassTypeIds.push(classTypeId);
      });

      it('201 — updates name of an existing class type', async () => {
        const newName = `Updated-${uuidv4()}`;

        const response = await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ operation: 'update', classTypeId, name: newName })
          .expect(201);

        const body = response.body as Record<string, unknown>;
        expect(body).toHaveProperty('id', classTypeId);
        expect(body).toHaveProperty('name', newName);
      });

      it('201 — updates loggable and resultMetrics', async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ operation: 'update', classTypeId, loggable: true, resultMetrics: 'time' })
          .expect(201);

        const body = response.body as Record<string, unknown>;
        expect(body).toHaveProperty('loggable', true);
        expect(body).toHaveProperty('resultMetrics', 'time');
      });

      it('400 — update without classTypeId', async () => {
        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ operation: 'update', name: 'No Id Provided' })
          .expect(400);
      });

      it('404 — update with non-existent classTypeId', async () => {
        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ operation: 'update', classTypeId: uuidv4(), name: 'Ghost' })
          .expect(404);
      });

      it('400 — cross-gym: classTypeId from other gym is rejected', async () => {
        // Create a class type in the other gym
        const otherResponse = await request(app.getHttpServer())
          .post(`/api/gyms/${otherGymId}/configuration/class-types`)
          .set('x-user-id', otherOwnerUserId)
          .set('x-gym-id', otherGymId)
          .send({ operation: 'create', name: `OtherGymType-${uuidv4()}` })
          .expect(201);

        const otherClassTypeId = (otherResponse.body as Record<string, unknown>).id as string;
        createdClassTypeIds.push(otherClassTypeId);

        // Attempt to update it using gymId context
        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ operation: 'update', classTypeId: otherClassTypeId, name: 'CrossGymHack' })
          .expect(400);
      });
    });

    describe('operation: delete', () => {
      it('201 — soft-deletes an existing class type; deletedAt is set', async () => {
        // Create a class type to delete
        const createResponse = await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ operation: 'create', name: `DeleteTarget-${uuidv4()}` })
          .expect(201);

        const targetId = (createResponse.body as Record<string, unknown>).id as string;
        createdClassTypeIds.push(targetId);

        const response = await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ operation: 'delete', classTypeId: targetId })
          .expect(201);

        const body = response.body as Record<string, unknown>;
        expect(body).toHaveProperty('id', targetId);
        expect(body).toHaveProperty('deletedAt');
        expect(typeof body.deletedAt).toBe('string');
        expect(new Date(body.deletedAt as string).getTime()).not.toBeNaN();
      });

      it('400 — delete without classTypeId', async () => {
        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ operation: 'delete' })
          .expect(400);
      });

      it('404 — delete with non-existent classTypeId', async () => {
        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', gymId)
          .send({ operation: 'delete', classTypeId: uuidv4() })
          .expect(404);
      });
    });

    describe('authorization', () => {
      it('403 — athlete cannot configure class types', async () => {
        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', athleteUserId)
          .set('x-gym-id', gymId)
          .send({ operation: 'create', name: 'Athlete Type' })
          .expect(403);
      });

      it('403 — owner of another gym cannot configure class types in this gym', async () => {
        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', otherOwnerUserId)
          .set('x-gym-id', gymId)
          .send({ operation: 'create', name: 'Intruder Type' })
          .expect(403);
      });

      it('500 — gymId path does not match x-gym-id header', async () => {
        await request(app.getHttpServer())
          .post(`/api/gyms/${gymId}/configuration/class-types`)
          .set('x-user-id', ownerUserId)
          .set('x-gym-id', otherGymId)
          .send({ operation: 'create', name: 'Mismatch Type' })
          .expect(500);
      });
    });
  });
});
