import { NotFoundException } from '@nestjs/common';
import { UpdateUserProfileHandler } from './update-user-profile.handler';
import { UpdateUserProfileCommand } from '../update-user-profile.command';
import { UserService } from '../../../domain/user/user.service';
import { UserEntity } from '../../../domain/user/entities/user.entity';

/**
 * Regression coverage for the notification-preferences partial update.
 *
 * The bug: with `useDefineForClassFields` (TS target ES2023), class-transformer
 * instantiates UpdateNotificationPreferencesDto with EVERY declared field as an
 * own property — the unsent ones set to `undefined`. Spreading that DTO over the
 * stored prefs overwrote the existing `true`s with `undefined`, and jsonb
 * serialization dropped those keys — silently wiping the other three preferences
 * on any single-toggle update. The handler must only merge keys actually sent.
 */
describe('UpdateUserProfileHandler', () => {
  let handler: UpdateUserProfileHandler;
  let userService: jest.Mocked<Pick<UserService, 'getUserById' | 'saveUser'>>;

  const allTruePrefs = () => ({
    booking_confirmations: true,
    waitlist_updates: true,
    class_changes: true,
    class_reminders: true,
  });

  const makeUser = (): UserEntity =>
    ({
      id: 'user-1',
      name: 'Test Athlete',
      email: 'athlete@example.com',
      notificationPreferences: allTruePrefs(),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }) as UserEntity;

  beforeEach(() => {
    userService = {
      getUserById: jest.fn(),
      saveUser: jest.fn(),
    };
    handler = new UpdateUserProfileHandler(userService as unknown as UserService);
  });

  it('throws NotFoundException when the user does not exist', async () => {
    userService.getUserById.mockResolvedValue(null);
    await expect(
      handler.execute(new UpdateUserProfileCommand('missing', 'New Name')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('preserves unsent preferences when a single toggle is updated', async () => {
    const user = makeUser();
    userService.getUserById.mockResolvedValue(user);
    userService.saveUser.mockImplementation(async (u) => u);

    // Mirrors the class-transformer output under useDefineForClassFields: the
    // three unsent keys are present as own properties set to `undefined`.
    const command = new UpdateUserProfileCommand('user-1', undefined, {
      booking_confirmations: undefined,
      waitlist_updates: undefined,
      class_changes: undefined,
      class_reminders: false,
    } as never);

    const result = await handler.execute(command);

    expect(result.notificationPreferences).toEqual({
      booking_confirmations: true,
      waitlist_updates: true,
      class_changes: true,
      class_reminders: false,
    });
  });

  it('accumulates across successive partial updates', async () => {
    const user = makeUser();
    userService.getUserById.mockResolvedValue(user);
    userService.saveUser.mockImplementation(async (u) => u);

    await handler.execute(
      new UpdateUserProfileCommand('user-1', undefined, {
        booking_confirmations: undefined,
        waitlist_updates: undefined,
        class_changes: undefined,
        class_reminders: false,
      } as never),
    );
    const result = await handler.execute(
      new UpdateUserProfileCommand('user-1', undefined, {
        booking_confirmations: undefined,
        waitlist_updates: false,
        class_changes: undefined,
        class_reminders: undefined,
      } as never),
    );

    expect(result.notificationPreferences).toEqual({
      booking_confirmations: true,
      waitlist_updates: false,
      class_changes: true,
      class_reminders: false,
    });
  });

  it('updates the name without touching preferences', async () => {
    const user = makeUser();
    userService.getUserById.mockResolvedValue(user);
    userService.saveUser.mockImplementation(async (u) => u);

    const result = await handler.execute(
      new UpdateUserProfileCommand('user-1', 'Renamed'),
    );

    expect(result.name).toBe('Renamed');
    expect(result.notificationPreferences).toEqual(allTruePrefs());
  });
});
