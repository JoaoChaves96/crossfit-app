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
  status: 'published',
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

function buildApiClientWithClassData(mockApi = createMockApiClient()) {
  mockApi.get.mockImplementation((url: string) => {
    if (url.includes(`/classes/${CLASS_ID}`)) return Promise.resolve(CLASS_DETAIL);
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
            duration: 60,
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
});
