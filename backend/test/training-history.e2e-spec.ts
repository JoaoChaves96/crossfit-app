import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { generateTestToken } from './helpers/jwt.helper';
import { listenOnEphemeralPort } from './helpers/listen';

/**
 * E2E tests for GET /api/gyms/:gymId/athletes/me/history
 *
 * The endpoint answers one question — "what have I trained here?" — and the
 * interesting part is everything it must leave out. So the fixture deliberately
 * seeds history that must NOT come back: a class the athlete was marked absent
 * for, a class that has not reached `completed`, a soft-deleted class, a peer's
 * result on a class they both attended, and — the whole point of these tests —
 * a class the same athlete genuinely attended at a *second gym* they are also a
 * member of.
 *
 * That second gym matters because the guard cannot catch it. The athlete has an
 * active membership in both gyms, so `RolesGuard` lets them into either history
 * route; the only thing keeping the two apart is the service's own `gymId`
 * scoping. To prove the scoping rather than an accident of the fixture, each
 * test asserts the class is absent from one gym's history *and* present in the
 * other's.
 *
 * Tokens carry a `gymId` claim, but nothing compares it to the route: access
 * here is decided by the database rows, not the JWT.
 */
describe('GET /api/gyms/:gymId/athletes/me/history', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  // Two gyms, and one athlete who is an active member of both.
  const gymId = uuid();
  const otherGymId = uuid();

  const ownerUserId = uuid();
  const otherOwnerUserId = uuid();
  const coachUserId = uuid();
  const athleteUserId = uuid();
  const peerAthleteUserId = uuid();
  const strangerUserId = uuid();

  const spaceId = uuid();
  const otherSpaceId = uuid();
  const classTypeId = uuid();
  const otherClassTypeId = uuid();

  // Classes that must appear, newest first.
  const archivedClassId = uuid(); // 2025-03-12 18:00, archived, no result
  const sameDayLaterClassId = uuid(); // 2025-03-10 19:00, completed, result
  const completedClassId = uuid(); // 2025-03-10 09:00, completed, result

  // Classes that must not appear.
  const absentClassId = uuid(); // completed, but present = false
  const publishedClassId = uuid(); // present = true, but still published
  const deletedClassId = uuid(); // completed and present, but soft-deleted
  const otherGymClassId = uuid(); // completed and present — at the other gym

  const expectedOrder = [
    archivedClassId,
    sameDayLaterClassId,
    completedClassId,
  ];

  const completedResultId = uuid();
  const sameDayLaterResultId = uuid();
  const peerResultId = uuid();
  const otherGymResultId = uuid();
  const deletedClassResultId = uuid();

  const athleteToken = generateTestToken({
    id: athleteUserId,
    email: 'athlete@history.test',
    gymId,
    role: 'athlete',
  });
  const peerAthleteToken = generateTestToken({
    id: peerAthleteUserId,
    email: 'peer@history.test',
    gymId,
    role: 'athlete',
  });
  const ownerToken = generateTestToken({
    id: ownerUserId,
    email: 'owner@history.test',
    gymId,
    role: 'owner',
  });
  const coachToken = generateTestToken({
    id: coachUserId,
    email: 'coach@history.test',
    gymId,
    role: 'coach',
  });
  const strangerToken = generateTestToken({
    id: strangerUserId,
    email: 'stranger@history.test',
    gymId,
    role: 'athlete',
  });

  const endpoint = (targetGymId: string) =>
    `/api/gyms/${targetGymId}/athletes/me/history`;

  interface HistoryItem {
    classId: string;
    className: string;
    coachName: string;
    scheduledAt: string;
    classState: string;
    result: {
      id: string;
      metricType: string;
      value: string;
      unit: string;
      notes: string | null;
      loggedAt: string;
      editedAt: string | null;
    } | null;
  }

  async function history(
    token: string,
    targetGymId = gymId,
  ): Promise<HistoryItem[]> {
    const response = await request(app.getHttpServer())
      .get(endpoint(targetGymId))
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return (response.body as { history: HistoryItem[] }).history;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await listenOnEphemeralPort(app);

    dataSource = moduleFixture.get(DataSource);

    await dataSource.query(
      `INSERT INTO users (id, email, name, status, "createdAt") VALUES
        ($1, $2,  'TH Owner',       'active', NOW()),
        ($3, $4,  'TH Other Owner', 'active', NOW()),
        ($5, $6,  'Ana Coach',      'active', NOW()),
        ($7, $8,  'TH Athlete',     'active', NOW()),
        ($9, $10, 'TH Peer',        'active', NOW()),
        ($11,$12, 'TH Stranger',    'active', NOW())`,
      [
        ownerUserId,
        `th-owner-${uuid()}@test.local`,
        otherOwnerUserId,
        `th-other-owner-${uuid()}@test.local`,
        coachUserId,
        `th-coach-${uuid()}@test.local`,
        athleteUserId,
        `th-athlete-${uuid()}@test.local`,
        peerAthleteUserId,
        `th-peer-${uuid()}@test.local`,
        strangerUserId,
        `th-stranger-${uuid()}@test.local`,
      ],
    );

    await dataSource.query(
      `INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
       VALUES ($1, $2, NULL, $3, $4, 'active', NOW(), NOW()),
              ($5, $6, NULL, $7, $8, 'active', NOW(), NOW())`,
      [
        gymId,
        'TH Primary Gym',
        'Lisbon',
        ownerUserId,
        otherGymId,
        'TH Other Gym',
        'Porto',
        otherOwnerUserId,
      ],
    );

    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt") VALUES
        ($1, $2,  $3,  'owner', 'active', NOW()),
        ($4, $5,  $6,  'owner', 'active', NOW()),
        ($7, $8,  $9,  'coach', 'active', NOW())`,
      [
        uuid(), gymId, ownerUserId,
        uuid(), otherGymId, otherOwnerUserId,
        uuid(), gymId, coachUserId,
      ],
    );

    // The athlete is a member of BOTH gyms; the peer only of the primary one.
    await dataSource.query(
      `INSERT INTO gym_memberships (id, "gymId", "userId", status, "joinedAt") VALUES
        ($1, $2, $3, 'active', NOW()),
        ($4, $5, $6, 'active', NOW()),
        ($7, $8, $9, 'active', NOW())`,
      [
        uuid(), gymId, athleteUserId,
        uuid(), otherGymId, athleteUserId,
        uuid(), gymId, peerAthleteUserId,
      ],
    );

    await dataSource.query(
      `INSERT INTO spaces (id, "gymId", name, "baseCapacity") VALUES
        ($1, $2, 'Main Box', 20),
        ($3, $4, 'Other Box', 20)`,
      [spaceId, gymId, otherSpaceId, otherGymId],
    );

    await dataSource.query(
      `INSERT INTO class_types (id, "gymId", name, "resultMetrics", loggable) VALUES
        ($1, $2, 'Metcon', 'time', true),
        ($3, $4, 'Other Gym Metcon', 'time', true)`,
      [classTypeId, gymId, otherClassTypeId, otherGymId],
    );

    const insertClass = (
      id: string,
      targetGymId: string,
      targetClassTypeId: string,
      targetSpaceId: string,
      date: string,
      time: string,
      state: string,
      deleted: boolean,
    ) =>
      dataSource.query(
        `INSERT INTO classes (id, "gymId", "classTypeId", "coachUserId", "spaceId",
           "scheduledDate", "scheduledTime", capacity, state, loggable, "deletedAt",
           "createdAt", "lastModifiedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 20, $8, true, $9, NOW(), NOW())`,
        [
          id,
          targetGymId,
          targetClassTypeId,
          coachUserId,
          targetSpaceId,
          date,
          time,
          state,
          deleted ? new Date('2025-03-20T00:00:00Z') : null,
        ],
      );

    await insertClass(archivedClassId, gymId, classTypeId, spaceId, '2025-03-12', '18:00:00', 'archived', false);
    await insertClass(sameDayLaterClassId, gymId, classTypeId, spaceId, '2025-03-10', '19:00:00', 'completed', false);
    await insertClass(completedClassId, gymId, classTypeId, spaceId, '2025-03-10', '09:00:00', 'completed', false);
    await insertClass(absentClassId, gymId, classTypeId, spaceId, '2025-03-11', '09:00:00', 'completed', false);
    await insertClass(publishedClassId, gymId, classTypeId, spaceId, '2025-03-13', '09:00:00', 'published', false);
    await insertClass(deletedClassId, gymId, classTypeId, spaceId, '2025-03-14', '09:00:00', 'completed', true);
    // The other gym needs its own coach row so the join in the query resolves.
    await dataSource.query(
      `INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
       VALUES ($1, $2, $3, 'coach', 'active', NOW())`,
      [uuid(), otherGymId, coachUserId],
    );
    await insertClass(otherGymClassId, otherGymId, otherClassTypeId, otherSpaceId, '2025-03-15', '09:00:00', 'completed', false);

    const markPresent = (
      classId: string,
      userId: string,
      present: boolean,
    ) =>
      dataSource.query(
        `INSERT INTO attendance (id, "classId", "userId", present, "markedAt", "markedByUserId", notes)
         VALUES ($1, $2, $3, $4, NOW(), $5, NULL)`,
        [uuid(), classId, userId, present, coachUserId],
      );

    await markPresent(archivedClassId, athleteUserId, true);
    await markPresent(sameDayLaterClassId, athleteUserId, true);
    await markPresent(completedClassId, athleteUserId, true);
    await markPresent(absentClassId, athleteUserId, false);
    await markPresent(publishedClassId, athleteUserId, true);
    await markPresent(deletedClassId, athleteUserId, true);
    await markPresent(otherGymClassId, athleteUserId, true);
    // The peer attended one of the same classes and logged their own result.
    await markPresent(completedClassId, peerAthleteUserId, true);

    const logResult = (
      id: string,
      classId: string,
      userId: string,
      value: string,
      notes: string | null,
    ) =>
      dataSource.query(
        `INSERT INTO results (id, "classId", "userId", "metricType", value, unit, notes, "loggedAt", "editedAt")
         VALUES ($1, $2, $3, 'time', $4, 'seconds', $5, NOW(), NULL)`,
        [id, classId, userId, value, notes],
      );

    await logResult(completedResultId, completedClassId, athleteUserId, '301', 'Felt strong');
    await logResult(sameDayLaterResultId, sameDayLaterClassId, athleteUserId, '288', null);
    await logResult(peerResultId, completedClassId, peerAthleteUserId, '555', 'Peer only');
    await logResult(otherGymResultId, otherGymClassId, athleteUserId, '444', 'Other gym');
    await logResult(deletedClassResultId, deletedClassId, athleteUserId, '999', null);
  }, 30000);

  afterAll(async () => {
    const classIds = [
      archivedClassId,
      sameDayLaterClassId,
      completedClassId,
      absentClassId,
      publishedClassId,
      deletedClassId,
      otherGymClassId,
    ];
    await dataSource.query(
      `DELETE FROM results WHERE "classId" = ANY($1::uuid[])`,
      [classIds],
    );
    await dataSource.query(
      `DELETE FROM attendance WHERE "classId" = ANY($1::uuid[])`,
      [classIds],
    );
    await dataSource.query(`DELETE FROM classes WHERE id = ANY($1::uuid[])`, [
      classIds,
    ]);
    await dataSource.query(
      `DELETE FROM class_types WHERE "gymId" IN ($1, $2)`,
      [gymId, otherGymId],
    );
    await dataSource.query(`DELETE FROM spaces WHERE "gymId" IN ($1, $2)`, [
      gymId,
      otherGymId,
    ]);
    await dataSource.query(
      `DELETE FROM gym_memberships WHERE "gymId" IN ($1, $2)`,
      [gymId, otherGymId],
    );
    await dataSource.query(`DELETE FROM gym_staff WHERE "gymId" IN ($1, $2)`, [
      gymId,
      otherGymId,
    ]);
    await dataSource.query(`DELETE FROM gyms WHERE id IN ($1, $2)`, [
      gymId,
      otherGymId,
    ]);
    await dataSource.query(
      `DELETE FROM users WHERE id = ANY($1::uuid[])`,
      [
        [
          ownerUserId,
          otherOwnerUserId,
          coachUserId,
          athleteUserId,
          peerAthleteUserId,
          strangerUserId,
        ],
      ],
    );
    await app.close();
  }, 30000);

  describe('what the athlete gets back', () => {
    it('returns every attended past class, newest first, breaking a date tie by time', async () => {
      const items = await history(athleteToken);

      expect(items.map((i) => i.classId)).toEqual(expectedOrder);
    });

    it('describes a class by its type, coach, combined schedule and state', async () => {
      const items = await history(athleteToken);
      const entry = items.find((i) => i.classId === completedClassId);

      expect(entry).toMatchObject({
        className: 'Metcon',
        coachName: 'Ana Coach',
        scheduledAt: '2025-03-10T09:00:00',
        classState: 'completed',
      });
    });

    it('reports an archived class as archived, not as completed', async () => {
      const items = await history(athleteToken);

      expect(
        items.find((i) => i.classId === archivedClassId)?.classState,
      ).toBe('archived');
    });

    it('attaches the athlete\'s own logged result to the class it belongs to', async () => {
      const items = await history(athleteToken);

      expect(
        items.find((i) => i.classId === completedClassId)?.result,
      ).toMatchObject({
        id: completedResultId,
        metricType: 'time',
        value: '301',
        unit: 'seconds',
        notes: 'Felt strong',
        editedAt: null,
      });
      expect(
        items.find((i) => i.classId === sameDayLaterClassId)?.result?.value,
      ).toBe('288');
    });

    it('returns a null result for an attended class nobody logged anything for', async () => {
      const items = await history(athleteToken);

      expect(items.find((i) => i.classId === archivedClassId)?.result).toBeNull();
    });
  });

  describe('what it must leave out', () => {
    it('excludes a class the athlete was marked absent for', async () => {
      const items = await history(athleteToken);

      expect(items.map((i) => i.classId)).not.toContain(absentClassId);
    });

    it('excludes a class that has not reached completed, even with attendance recorded', async () => {
      const items = await history(athleteToken);

      expect(items.map((i) => i.classId)).not.toContain(publishedClassId);
    });

    it('excludes a soft-deleted class', async () => {
      const items = await history(athleteToken);

      expect(items.map((i) => i.classId)).not.toContain(deletedClassId);
    });

    it('never shows another athlete\'s result for a class they both attended', async () => {
      const items = await history(athleteToken);
      const shared = items.find((i) => i.classId === completedClassId);

      expect(shared?.result?.id).toBe(completedResultId);
      expect(shared?.result?.value).not.toBe('555');

      // And symmetrically, from the peer's side.
      const peerItems = await history(peerAthleteToken);
      expect(peerItems.map((i) => i.classId)).toEqual([completedClassId]);
      expect(peerItems[0].result?.id).toBe(peerResultId);
    });
  });

  describe('gym scoping — the same athlete, two gyms', () => {
    it('omits a class the athlete attended at another gym they are also a member of', async () => {
      const items = await history(athleteToken, gymId);

      expect(items.map((i) => i.classId)).not.toContain(otherGymClassId);
    });

    it('returns that same class — and only it — when asked for the other gym', async () => {
      const items = await history(athleteToken, otherGymId);

      expect(items.map((i) => i.classId)).toEqual([otherGymClassId]);
      expect(items[0]).toMatchObject({
        className: 'Other Gym Metcon',
        classState: 'completed',
      });
      expect(items[0].result?.value).toBe('444');
    });

    it('keeps the two histories disjoint, so neither gym leaks into the other', async () => {
      const [primary, other] = await Promise.all([
        history(athleteToken, gymId),
        history(athleteToken, otherGymId),
      ]);

      const overlap = primary
        .map((i) => i.classId)
        .filter((id) => other.some((o) => o.classId === id));
      expect(overlap).toEqual([]);
    });
  });

  describe('empty history', () => {
    it('returns an empty array, not an error, for a member who has trained nothing', async () => {
      const response = await request(app.getHttpServer())
        .get(endpoint(gymId))
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toEqual({ history: [] });
    });
  });

  describe('authorization', () => {
    it('401s with no token', async () => {
      await request(app.getHttpServer()).get(endpoint(gymId)).expect(401);
    });

    it('403s for a user with no membership or staff role at the gym', async () => {
      await request(app.getHttpServer())
        .get(endpoint(gymId))
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(403);
    });

    it('403s for an athlete asking for a gym they are not a member of, despite being a member elsewhere', async () => {
      await request(app.getHttpServer())
        .get(endpoint(otherGymId))
        .set('Authorization', `Bearer ${peerAthleteToken}`)
        .expect(403);
    });

    it('lets a coach read their own history at the gym', async () => {
      const response = await request(app.getHttpServer())
        .get(endpoint(gymId))
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);

      expect(response.body).toEqual({ history: [] });
    });

    it('403s on a well-formed but unknown gym id, rather than answering with an empty history', async () => {
      await request(app.getHttpServer())
        .get(endpoint(uuid()))
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(403);
    });
  });
});
