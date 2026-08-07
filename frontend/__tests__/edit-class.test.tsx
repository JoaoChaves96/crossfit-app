import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import EditClassScreen from '@/app/edit-class';
import { AuthWrapper } from '@/test-utils/auth-wrapper';
import { createMockApiClient } from '@/test-utils/mock-api-client';
import { GymContext } from '@/context/GymContext';
import { useRouter, useLocalSearchParams } from 'expo-router';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/utils/api-client', () => ({
  createApiClient: jest.fn(),
}));

import { createApiClient } from '@/utils/api-client';

// ─── Stable router mock ───────────────────────────────────────────────────────

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const GYM_ID = 'gym-123';
const CLASS_ID = 'class-abc';

const GYM_CONTEXT = {
  currentGymId: GYM_ID,
  isLoading: false,
  setCurrentGymId: jest.fn(),
};

const CLASS_DETAIL = {
  id: CLASS_ID,
  classTypeId: 'ct-1',
  classTypeName: 'CrossFit',
  coachUserId: 'coach-1',
  coachEmail: 'coach@example.com',
  spaceId: 'space-1',
  spaceName: 'Main Floor',
  scheduledDate: '2026-06-01',
  scheduledTime: '09:00',
  capacity: 20,
  duration: 60,
  // The DTO field is `state`, not `status` — a published class is the only one
  // the backend lets you edit or delete.
  state: 'published',
  bookedCount: 0,
};

const CLASS_TYPES_RESPONSE = {
  classTypes: [
    { id: 'ct-1', name: 'CrossFit' },
    { id: 'ct-2', name: 'Olympic Lifting' },
  ],
};

const COACHES_RESPONSE = {
  coaches: [
    { userId: 'coach-1', email: 'coach@example.com' },
    { userId: 'coach-2', email: 'other@example.com' },
  ],
};

const SPACES_RESPONSE = {
  spaces: [
    { id: 'space-1', name: 'Main Floor' },
    { id: 'space-2', name: 'Room B' },
  ],
};

function buildApiClientWithClassData(
  mockApi = createMockApiClient(),
  classDetail: Record<string, unknown> = CLASS_DETAIL,
) {
  mockApi.get.mockImplementation((url: string) => {
    if (url.includes(`/classes/${CLASS_ID}`)) return Promise.resolve(classDetail);
    if (url.includes('class-types')) return Promise.resolve(CLASS_TYPES_RESPONSE);
    if (url.includes('coaches')) return Promise.resolve(COACHES_RESPONSE);
    if (url.includes('spaces')) return Promise.resolve(SPACES_RESPONSE);
    return Promise.reject(new Error(`Unexpected GET: ${url}`));
  });
  return mockApi;
}

function renderScreen(mockApi = buildApiClientWithClassData()) {
  (createApiClient as jest.Mock).mockReturnValue(mockApi);
  (useLocalSearchParams as jest.Mock).mockReturnValue({ classId: CLASS_ID });

  return render(
    <GymContext.Provider value={GYM_CONTEXT}>
      <AuthWrapper>
        <EditClassScreen />
      </AuthWrapper>
    </GymContext.Provider>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EditClassScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ classId: CLASS_ID });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('form pre-fills with existing class data on mount', () => {
    it('shows the loaded date value in the date field', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByDisplayValue('2026-06-01')).toBeTruthy();
      });
    });

    it('shows the loaded time value in the time field', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByDisplayValue('09:00')).toBeTruthy();
      });
    });

    it('shows the loaded capacity value in the capacity field', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByDisplayValue('20')).toBeTruthy();
      });
    });

    it('shows the loaded duration value in the duration field', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByDisplayValue('60')).toBeTruthy();
      });
    });

    it('shows the loaded class type in the class type picker', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByText('CrossFit')).toBeTruthy();
      });
    });

    it('shows the loaded coach in the coach picker', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByText('coach@example.com')).toBeTruthy();
      });
    });

    it('shows the loaded space in the space picker', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByText('Main Floor')).toBeTruthy();
      });
    });
  });

  describe('submit calls PATCH with correct payload', () => {
    it('calls PATCH to the correct endpoint with changed fields', async () => {
      const mockApi = buildApiClientWithClassData();
      mockApi.patch.mockResolvedValueOnce({ id: CLASS_ID });
      const utils = renderScreen(mockApi);

      await waitFor(() => {
        expect(utils.getByDisplayValue('2026-06-01')).toBeTruthy();
      });

      // Change the date
      fireEvent.changeText(utils.getByDisplayValue('2026-06-01'), '2026-07-15');

      await act(async () => {
        fireEvent.press(utils.getByText('Save Changes'));
      });

      await waitFor(() => {
        expect(mockApi.patch).toHaveBeenCalledWith(
          `/api/gyms/${GYM_ID}/classes/${CLASS_ID}`,
          expect.objectContaining({
            scheduledDate: '2026-07-15',
          })
        );
      });
    });

    it('includes all non-empty form fields in the PATCH payload', async () => {
      const mockApi = buildApiClientWithClassData();
      mockApi.patch.mockResolvedValueOnce({ id: CLASS_ID });
      const utils = renderScreen(mockApi);

      await waitFor(() => {
        expect(utils.getByDisplayValue('2026-06-01')).toBeTruthy();
      });

      // Save only enables once something changes, so dirty the duration and
      // assert every other field still rides along in the payload.
      fireEvent.changeText(utils.getByDisplayValue('60'), '45');

      await act(async () => {
        fireEvent.press(utils.getByText('Save Changes'));
      });

      await waitFor(() => {
        expect(mockApi.patch).toHaveBeenCalledWith(
          `/api/gyms/${GYM_ID}/classes/${CLASS_ID}`,
          expect.objectContaining({
            classTypeId: 'ct-1',
            coachUserId: 'coach-1',
            spaceId: 'space-1',
            scheduledDate: '2026-06-01',
            scheduledTime: '09:00',
            capacity: 20,
            duration: 45,
          })
        );
      });
    });

    it('does not call PATCH when date format is invalid', async () => {
      const mockApi = buildApiClientWithClassData();
      const utils = renderScreen(mockApi);

      await waitFor(() => {
        expect(utils.getByDisplayValue('2026-06-01')).toBeTruthy();
      });

      fireEvent.changeText(utils.getByDisplayValue('2026-06-01'), 'not-a-date');

      await act(async () => {
        fireEvent.press(utils.getByText('Save Changes'));
      });

      await waitFor(() => {
        expect(utils.getByText('Use format YYYY-MM-DD')).toBeTruthy();
      });

      expect(mockApi.patch).not.toHaveBeenCalled();
    });
  });

  describe('delete action shows confirm dialog before calling DELETE', () => {
    it('calls Alert.alert when Delete Class is pressed', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByText('Delete Class')).toBeTruthy();
      });

      // Act
      fireEvent.press(utils.getByText('Delete Class'));

      // Assert — dialog shown, DELETE not yet called
      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Class',
        expect.stringContaining('Are you sure'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Delete', style: 'destructive' }),
        ])
      );
    });

    it('does not call DELETE when Cancel is pressed in the dialog', async () => {
      const mockApi = buildApiClientWithClassData();
      const utils = renderScreen(mockApi);

      await waitFor(() => {
        expect(utils.getByText('Delete Class')).toBeTruthy();
      });

      fireEvent.press(utils.getByText('Delete Class'));

      // Simulate pressing Cancel in the Alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const cancelButton = alertCall[2].find(
        (btn: { text: string }) => btn.text === 'Cancel'
      );
      cancelButton.onPress?.();

      expect(mockApi.delete).not.toHaveBeenCalled();
    });

    it('calls DELETE when Delete is confirmed in the dialog', async () => {
      const mockApi = buildApiClientWithClassData();
      mockApi.delete.mockResolvedValueOnce({ success: true });
      const utils = renderScreen(mockApi);

      await waitFor(() => {
        expect(utils.getByText('Delete Class')).toBeTruthy();
      });

      fireEvent.press(utils.getByText('Delete Class'));

      // Simulate pressing Delete in the Alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteButton = alertCall[2].find(
        (btn: { text: string }) => btn.text === 'Delete'
      );

      await act(async () => {
        await deleteButton.onPress();
      });

      expect(mockApi.delete).toHaveBeenCalledWith(
        `/api/gyms/${GYM_ID}/classes/${CLASS_ID}`
      );
    });
  });

  describe('navigation after successful actions', () => {
    it('navigates to class-management route after successful save', async () => {
      const mockApi = buildApiClientWithClassData();
      mockApi.patch.mockResolvedValueOnce({ id: CLASS_ID });
      const utils = renderScreen(mockApi);

      await waitFor(() => {
        expect(utils.getByDisplayValue('2026-06-01')).toBeTruthy();
      });

      // Save is disabled on a pristine form, so make a change first.
      fireEvent.changeText(utils.getByDisplayValue('2026-06-01'), '2026-07-15');

      await act(async () => {
        fireEvent.press(utils.getByText('Save Changes'));
      });

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining('class-management')
        );
      });
    });

    it('navigates to schedule-dashboard after successful delete', async () => {
      const mockApi = buildApiClientWithClassData();
      mockApi.delete.mockResolvedValueOnce({ success: true });
      const utils = renderScreen(mockApi);

      await waitFor(() => {
        expect(utils.getByText('Delete Class')).toBeTruthy();
      });

      fireEvent.press(utils.getByText('Delete Class'));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteButton = alertCall[2].find(
        (btn: { text: string }) => btn.text === 'Delete'
      );

      await act(async () => {
        await deleteButton.onPress();
      });

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/schedule-dashboard');
      });
    });

    it('navigates back when Cancel is pressed', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByText('Cancel')).toBeTruthy();
      });

      fireEvent.press(utils.getByText('Cancel'));

      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  // ─── Save gating ────────────────────────────────────────────────────────────
  // Save must stay disabled until the form actually differs from the loaded
  // class, so an owner cannot fire a no-op PATCH by tapping a pristine form.

  describe('Save is disabled until the form changes', () => {
    it('disables Save on a freshly loaded form', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByDisplayValue('2026-06-01')).toBeTruthy();
      });

      expect(utils.getByTestId('edit-class-save-btn').props.accessibilityState.disabled).toBe(true);
    });

    it('does not PATCH when Save is pressed on a pristine form', async () => {
      const mockApi = buildApiClientWithClassData();
      const utils = renderScreen(mockApi);

      await waitFor(() => {
        expect(utils.getByDisplayValue('2026-06-01')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(utils.getByText('Save Changes'));
      });

      expect(mockApi.patch).not.toHaveBeenCalled();
    });

    it('enables Save once a field is edited', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByDisplayValue('2026-06-01')).toBeTruthy();
      });

      fireEvent.changeText(utils.getByDisplayValue('2026-06-01'), '2026-07-15');

      expect(utils.getByTestId('edit-class-save-btn').props.accessibilityState.disabled).toBe(false);
    });

    it('disables Save again when the edit is reverted by hand', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByDisplayValue('2026-06-01')).toBeTruthy();
      });

      fireEvent.changeText(utils.getByDisplayValue('2026-06-01'), '2026-07-15');
      fireEvent.changeText(utils.getByDisplayValue('2026-07-15'), '2026-06-01');

      expect(utils.getByTestId('edit-class-save-btn').props.accessibilityState.disabled).toBe(true);
    });
  });

  // ─── Lifecycle gating ───────────────────────────────────────────────────────
  // The backend rejects edit AND delete unless the class is `published`
  // (edit-class.handler / delete-class.handler). Past that, the screen must not
  // offer actions that would fail.

  describe('a class past published renders read-only', () => {
    const LOCKED_STATES = ['booking_closed', 'in_progress', 'completed', 'archived'] as const;

    function renderLocked(state: string) {
      const mockApi = buildApiClientWithClassData(createMockApiClient(), {
        ...CLASS_DETAIL,
        state,
      });
      return renderScreen(mockApi);
    }

    it.each(LOCKED_STATES)('hides Save, Delete and the form when state is %s', async (state) => {
      const utils = renderLocked(state);

      await waitFor(() => {
        expect(utils.getByTestId('edit-class-readonly-notice')).toBeTruthy();
      });

      expect(utils.queryByTestId('edit-class-save-btn')).toBeNull();
      expect(utils.queryByTestId('edit-class-delete-btn')).toBeNull();
      expect(utils.queryByTestId('edit-class-date-input')).toBeNull();
    });

    it('shows the class values as read-only text instead', async () => {
      const utils = renderLocked('completed');

      await waitFor(() => {
        expect(utils.getByTestId('edit-class-readonly-notice')).toBeTruthy();
      });

      expect(utils.getByText('2026-06-01')).toBeTruthy();
      expect(utils.getByText('09:00')).toBeTruthy();
      expect(utils.getByText('60 min')).toBeTruthy();
    });

    it('titles the screen Class Details rather than Edit Class', async () => {
      const utils = renderLocked('archived');

      await waitFor(() => {
        expect(utils.getByText('Class Details')).toBeTruthy();
      });

      expect(utils.queryByText('Edit Class')).toBeNull();
    });

    it('still offers a way back', async () => {
      const utils = renderLocked('completed');

      await waitFor(() => {
        expect(utils.getByTestId('edit-class-back-to-class-btn')).toBeTruthy();
      });

      fireEvent.press(utils.getByTestId('edit-class-back-to-class-btn'));

      expect(mockRouter.back).toHaveBeenCalled();
    });

    it('keeps the form editable for a published class', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByDisplayValue('2026-06-01')).toBeTruthy();
      });

      expect(utils.queryByTestId('edit-class-readonly-notice')).toBeNull();
      expect(utils.getByTestId('edit-class-save-btn')).toBeTruthy();
    });
  });
});
