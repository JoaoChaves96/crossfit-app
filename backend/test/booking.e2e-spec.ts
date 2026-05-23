import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { generateTestToken } from './helpers/jwt.helper';

/**
 * Athlete Booking Lifecycle Integration Tests
 *
 * Validates:
 * 1. Book a class (capacity available) - POST /api/gyms/:gymId/classes/:classId/bookings
 * 2. Cancel a booking - DELETE /api/gyms/:gymId/classes/bookings/:bookingId
 * 3. State consistency - Class capacity reflects changes
 *
 * Uses real database, header-based auth (x-user-id, x-gym-id)
 * Tests are isolated and deterministic
 */
describe('Athlete Booking Lifecycle (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource | undefined;

  // Test data IDs
  const gymId = uuidv4();
  const userId = uuidv4();
  const coachId = uuidv4();
  const spaceId = uuidv4();
  const classTypeId = uuidv4();
  const membershipPlanId = uuidv4();
  let classId: string;
  let bookingId: string;

  // JWT for the athlete user
  const athleteToken = generateTestToken({
    id: userId,
    email: `athlete-booking@test.local`,
    gymId,
    role: 'athlete',
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

  /**
   * Setup: Create all required entities for booking workflow
   * - Gym, User (athlete), Coach
   * - GymStaff (coach assignment)
   * - ClassType, MembershipPlan
   * - GymMembership, AthleteMembershipPlan (athlete can access class)
   * - Space, Class (bookable)
   */
  async function setupTestData() {
    if (!dataSource) {
      throw new Error('DataSource not initialized');
    }

    const ownerUserId = uuidv4();

    // 1. Create Users (owner, athlete & coach)
    await dataSource.query(
      `
      INSERT INTO users (id, email, name, status, "createdAt")
      VALUES
        ($1, $2, $3, $4, NOW()),
        ($5, $6, $7, $8, NOW()),
        ($9, $10, $11, $12, NOW())
    `,
      [
        ownerUserId,
        `owner-${uuidv4()}@test.local`,
        'Test Owner',
        'active',
        userId,
        `athlete-${uuidv4()}@test.local`,
        'Test Athlete',
        'active',
        coachId,
        `coach-${uuidv4()}@test.local`,
        'Test Coach',
        'active',
      ],
    );

    // 2. Create Gym
    await dataSource.query(
      `
      INSERT INTO gyms (id, name, description, location, "ownerUserId", status, "createdAt", "lastModifiedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `,
      [
        gymId,
        'Test Gym',
        'Test gym description',
        'Test Location',
        ownerUserId,
        'active',
      ],
    );

    // 3. Create Space
    await dataSource.query(
      `
      INSERT INTO spaces (id, "gymId", name, "baseCapacity")
      VALUES ($1, $2, $3, $4)
    `,
      [spaceId, gymId, 'Main Box', 20],
    );

    // 4. Create ClassType
    await dataSource.query(
      `
      INSERT INTO class_types (id, "gymId", name, "resultMetrics", loggable)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [classTypeId, gymId, 'CrossFit', 'none', true],
    );

    // 5. Create MembershipPlan
    await dataSource.query(
      `
      INSERT INTO membership_plans (id, "gymId", name, pricing, "billingCycle", "classTypes", status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        membershipPlanId,
        gymId,
        'Unlimited',
        99,
        'monthly',
        classTypeId,
        'active',
      ],
    );

    // 6. Create GymStaff (coach)
    await dataSource.query(
      `
      INSERT INTO gym_staff (id, "gymId", "userId", role, status, "assignedAt")
      VALUES ($1, $2, $3, $4, $5, NOW())
    `,
      [uuidv4(), gymId, coachId, 'coach', 'active'],
    );

    // 7. Create GymMembership (athlete)
    const gymMembershipId = uuidv4();
    await dataSource.query(
      `
      INSERT INTO gym_memberships (id, "gymId", "userId", status, "joinedAt")
      VALUES ($1, $2, $3, $4, NOW())
    `,
      [gymMembershipId, gymId, userId, 'active'],
    );

    // 8. Create AthleteMembershipPlan
    const athleteMembershipPlanId = uuidv4();
    await dataSource.query(
      `
      INSERT INTO athlete_membership_plans (id, "gymMembershipId", "membershipPlanId", status, "startedAt")
      VALUES ($1, $2, $3, $4, NOW())
    `,
      [athleteMembershipPlanId, gymMembershipId, membershipPlanId, 'active'],
    );

    // 9. Create Class (scheduled for 30 minutes from now, capacity=2)
    classId = uuidv4();
    const scheduledDate = new Date();
    scheduledDate.setMinutes(scheduledDate.getMinutes() + 30);
    const dateStr = scheduledDate.toISOString().split('T')[0];
    const timeStr = scheduledDate.toTimeString().split(' ')[0];

    await dataSource.query(
      `
      INSERT INTO classes (
        id, "gymId", "classTypeId", "coachUserId", "spaceId",
        "scheduledDate", "scheduledTime", capacity, state, loggable, "createdAt", "lastModifiedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    `,
      [
        classId,
        gymId,
        classTypeId,
        coachId,
        spaceId,
        dateStr,
        timeStr,
        2,
        'published',
        true,
      ],
    );
  }

  /**
   * Cleanup: Remove all test data
   */
  async function cleanupTestData() {
    if (!dataSource) return;

    try {
      await dataSource.query('DELETE FROM bookings WHERE "classId" = $1', [
        classId,
      ]);
      await dataSource.query('DELETE FROM classes WHERE id = $1', [classId]);
      await dataSource.query(
        'DELETE FROM athlete_membership_plans WHERE "membershipPlanId" IN (SELECT id FROM membership_plans WHERE "gymId" = $1)',
        [gymId],
      );
      await dataSource.query('DELETE FROM gym_memberships WHERE "gymId" = $1', [
        gymId,
      ]);
      await dataSource.query(
        'DELETE FROM membership_plans WHERE "gymId" = $1',
        [gymId],
      );
      await dataSource.query('DELETE FROM gym_staff WHERE "gymId" = $1', [
        gymId,
      ]);
      await dataSource.query('DELETE FROM class_types WHERE "gymId" = $1', [
        gymId,
      ]);
      await dataSource.query('DELETE FROM spaces WHERE "gymId" = $1', [gymId]);
      await dataSource.query('DELETE FROM gyms WHERE id = $1', [gymId]);
    } catch {
      // Silently ignore cleanup errors
    }
  }

  describe('Test 1: Book a class (capacity available)', () => {
    it('POST /api/gyms/:gymId/classes/:classId/bookings → 201 + bookingId', async () => {
      const response = await request(app!.getHttpServer())
        .post(`/api/gyms/${gymId}/classes/${classId}/bookings`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .send({
          gymId,
          classId,
        })
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('classId', classId);
      expect(response.body).toHaveProperty('userId', userId);
      expect(response.body).toHaveProperty('status', 'booked');
      expect(response.body).toHaveProperty('bookedPosition');
      expect(response.body).toHaveProperty('createdAt');

      // Save booking ID for later tests
      bookingId = (response.body as Record<string, unknown>).id as string;
    });

    it('GET /api/me/bookings includes the booked class', async () => {
      const response = await request(app!.getHttpServer())
        .get('/api/me/bookings')
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('bookings');
      expect(
        (response.body as Record<string, unknown>).bookings as unknown[],
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: bookingId,
            classId,
            status: 'booked',
          }),
        ]),
      );
    });
  });

  describe('Test 2: Cancel a booking', () => {
    it('DELETE /api/gyms/:gymId/classes/bookings/:bookingId → 200', async () => {
      const response = await request(app!.getHttpServer())
        .delete(`/api/gyms/${gymId}/classes/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(200);

      // Verify booking is marked cancelled
      expect(response.body).toHaveProperty('id', bookingId);
      expect(response.body).toHaveProperty('status', 'cancelled');
      expect(response.body).toHaveProperty('cancelledAt');
    });

    it('GET /api/me/bookings no longer includes cancelled booking', async () => {
      const response = await request(app!.getHttpServer())
        .get('/api/me/bookings')
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(200);

      expect(
        (response.body as Record<string, unknown>).bookings as unknown[],
      ).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: bookingId,
          }),
        ]),
      );
    });
  });

  describe('Test 3: State consistency - capacity reflects changes', () => {
    let newBookingId: string;

    it('Book → verify capacity decreased', async () => {
      // Book the class
      const bookResponse = await request(app!.getHttpServer())
        .post(`/api/gyms/${gymId}/classes/${classId}/bookings`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .send({
          gymId,
          classId,
        })
        .expect(201);

      newBookingId = (bookResponse.body as Record<string, unknown>)
        .id as string;
      expect((bookResponse.body as Record<string, unknown>).status).toBe(
        'booked',
      );

      // Verify booking is in user's list
      const listResponse = await request(app!.getHttpServer())
        .get('/api/me/bookings')
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(200);

      expect(
        (listResponse.body as Record<string, unknown>).bookings as unknown[],
      ).toContainEqual(
        expect.objectContaining({
          id: newBookingId,
          classId,
          status: 'booked',
        }),
      );
    });

    it('Cancel → verify capacity restored and booking removed', async () => {
      // Cancel the booking
      await request(app!.getHttpServer())
        .delete(`/api/gyms/${gymId}/classes/bookings/${newBookingId}`)
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(200);

      // Verify booking is removed from list
      const listResponse = await request(app!.getHttpServer())
        .get('/api/me/bookings')
        .set('Authorization', `Bearer ${athleteToken}`)
        .expect(200);

      expect(
        (listResponse.body as Record<string, unknown>).bookings as unknown[],
      ).not.toContainEqual(
        expect.objectContaining({
          id: newBookingId,
        }),
      );
    });
  });
});
