import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import CreateClassScreen from '@/app/create-class';
import { AuthWrapper } from '@/test-utils/auth-wrapper';
import { createMockApiClient } from '@/test-utils/mock-api-client';
import { GymContext } from '@/context/GymContext';
import { useRouter } from 'expo-router';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/utils/api-client', () => ({
  createApiClient: jest.fn(),
}));

import { createApiClient } from '@/utils/api-client';
// jsdom's window is 750px — under the 768px breakpoint — so an unpinned suite
// only ever renders the mobile register. Desktop mounts the OwnerSidebar beside
// the form, so pin the register and let the desktop block opt in.
let mockIsMobile = true;
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({ isMobile: mockIsMobile, isDesktop: !mockIsMobile, width: mockIsMobile ? 390 : 1280 }),
}));


// ─── Stable router mock ───────────────────────────────────────────────────────

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GYM_ID = 'gym-123';

const GYM_CONTEXT = {
  currentGymId: GYM_ID,
  isLoading: false,
  setCurrentGymId: jest.fn(),
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
  ],
};

const SPACES_RESPONSE = {
  spaces: [
    { id: 'space-1', name: 'Main Floor' },
  ],
};

function buildApiClientWithDropdowns(mockApi = createMockApiClient()) {
  mockApi.get.mockImplementation((url: string) => {
    if (url.includes('class-types')) return Promise.resolve(CLASS_TYPES_RESPONSE);
    if (url.includes('coaches')) return Promise.resolve(COACHES_RESPONSE);
    if (url.includes('spaces')) return Promise.resolve(SPACES_RESPONSE);
    return Promise.reject(new Error(`Unexpected GET: ${url}`));
  });
  return mockApi;
}

function renderScreen(mockApi = buildApiClientWithDropdowns()) {
  (createApiClient as jest.Mock).mockReturnValue(mockApi);

  return render(
    <GymContext.Provider value={GYM_CONTEXT}>
      <AuthWrapper>
        <CreateClassScreen />
      </AuthWrapper>
    </GymContext.Provider>
  );
}

/**
 * The Date/Time fields are picker affordances. On the native fallback path
 * (jest's default Platform), the underlying text entry is revealed by pressing
 * the field first. This helper presses the field then types the canonical
 * "YYYY-MM-DD" / "HH:mm" string into the placeholder input.
 */
function fillDateTime(utils: ReturnType<typeof renderScreen>, placeholder: string, value: string) {
  const testID = placeholder === 'YYYY-MM-DD' ? 'create-class-date-input' : 'create-class-time-input';
  fireEvent.press(utils.getByTestId(testID));
  fireEvent.changeText(utils.getByPlaceholderText(placeholder), value);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CreateClassScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMobile = true;
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe('submit with empty required fields does not call POST', () => {
    it('shows validation errors and does not call POST when required fields are empty', async () => {
      const mockApi = buildApiClientWithDropdowns();
      const utils = renderScreen(mockApi);

      await waitFor(() => {
        expect(utils.getByText('Save Class')).toBeTruthy();
      });

      // Act — press submit without filling any fields
      fireEvent.press(utils.getByText('Save Class'));

      // Assert — validation errors appear, POST not called
      await waitFor(() => {
        expect(utils.getByText('Class type is required')).toBeTruthy();
        expect(utils.getByText('Coach is required')).toBeTruthy();
        expect(utils.getByText('Space is required')).toBeTruthy();
        expect(utils.getByText('Date is required (YYYY-MM-DD)')).toBeTruthy();
        expect(utils.getByText('Time is required (HH:mm)')).toBeTruthy();
      });

      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('does not call POST when only date is missing', async () => {
      const mockApi = buildApiClientWithDropdowns();
      const utils = renderScreen(mockApi);

      await waitFor(() => {
        expect(utils.getByText('Select Class Type')).toBeTruthy();
      });

      // Open Class Type picker and select
      fireEvent.press(utils.getByText('Select Class Type'));
      fireEvent.press(utils.getByText('CrossFit'));

      // Open Coach picker and select
      fireEvent.press(utils.getByText('Select Coach'));
      fireEvent.press(utils.getByText('coach@example.com'));

      // Open Space picker and select
      fireEvent.press(utils.getByText('Select Space'));
      fireEvent.press(utils.getByText('Main Floor'));

      // Fill time but not date
      fillDateTime(utils, 'HH:mm', '09:00');

      fireEvent.press(utils.getByText('Save Class'));

      await waitFor(() => {
        expect(utils.getByText('Date is required (YYYY-MM-DD)')).toBeTruthy();
      });

      expect(mockApi.post).not.toHaveBeenCalled();
    });
  });

  describe('submit calls POST with correct payload when fields are filled', () => {
    it('calls POST to the correct endpoint with the correct payload', async () => {
      const mockApi = buildApiClientWithDropdowns();
      mockApi.post.mockResolvedValueOnce({ id: 'new-class-id' });
      const utils = renderScreen(mockApi);

      // Wait for dropdowns to load
      await waitFor(() => {
        expect(utils.getByText('Select Class Type')).toBeTruthy();
      });

      // Select Class Type
      fireEvent.press(utils.getByText('Select Class Type'));
      fireEvent.press(utils.getByText('CrossFit'));

      // Select Coach
      fireEvent.press(utils.getByText('Select Coach'));
      fireEvent.press(utils.getByText('coach@example.com'));

      // Select Space
      fireEvent.press(utils.getByText('Select Space'));
      fireEvent.press(utils.getByText('Main Floor'));

      // Fill date and time
      fillDateTime(utils, 'YYYY-MM-DD', '2026-06-01');
      fillDateTime(utils, 'HH:mm', '09:00');

      // Submit
      await act(async () => {
        fireEvent.press(utils.getByText('Save Class'));
      });

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith(
          `/api/gyms/${GYM_ID}/classes`,
          expect.objectContaining({
            classTypeId: 'ct-1',
            coachUserId: 'coach-1',
            spaceId: 'space-1',
            scheduledDate: '2026-06-01',
            scheduledTime: '09:00',
          })
        );
      });
    });

    it('includes capacity and duration in payload when provided', async () => {
      const mockApi = buildApiClientWithDropdowns();
      mockApi.post.mockResolvedValueOnce({ id: 'new-class-id' });
      const utils = renderScreen(mockApi);

      await waitFor(() => {
        expect(utils.getByText('Select Class Type')).toBeTruthy();
      });

      fireEvent.press(utils.getByText('Select Class Type'));
      fireEvent.press(utils.getByText('CrossFit'));
      fireEvent.press(utils.getByText('Select Coach'));
      fireEvent.press(utils.getByText('coach@example.com'));
      fireEvent.press(utils.getByText('Select Space'));
      fireEvent.press(utils.getByText('Main Floor'));

      fillDateTime(utils, 'YYYY-MM-DD', '2026-06-01');
      fillDateTime(utils, 'HH:mm', '09:00');
      fireEvent.changeText(utils.getByPlaceholderText('e.g. 15'), '20');
      fireEvent.changeText(utils.getByPlaceholderText('e.g. 60'), '60');

      await act(async () => {
        fireEvent.press(utils.getByText('Save Class'));
      });

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith(
          `/api/gyms/${GYM_ID}/classes`,
          expect.objectContaining({
            capacity: 20,
            duration: 60,
          })
        );
      });
    });

    it('navigates back after successful submit', async () => {
      const mockApi = buildApiClientWithDropdowns();
      mockApi.post.mockResolvedValueOnce({ id: 'new-class-id' });
      const utils = renderScreen(mockApi);

      await waitFor(() => {
        expect(utils.getByText('Select Class Type')).toBeTruthy();
      });

      fireEvent.press(utils.getByText('Select Class Type'));
      fireEvent.press(utils.getByText('CrossFit'));
      fireEvent.press(utils.getByText('Select Coach'));
      fireEvent.press(utils.getByText('coach@example.com'));
      fireEvent.press(utils.getByText('Select Space'));
      fireEvent.press(utils.getByText('Main Floor'));
      fillDateTime(utils, 'YYYY-MM-DD', '2026-06-01');
      fillDateTime(utils, 'HH:mm', '09:00');

      await act(async () => {
        fireEvent.press(utils.getByText('Save Class'));
      });

      await waitFor(() => {
        expect(mockRouter.back).toHaveBeenCalled();
      });
    });
  });

  describe('picker state updates correctly on selection', () => {
    it('updates classTypeId when a class type is selected', async () => {
      const mockApi = buildApiClientWithDropdowns();
      mockApi.post.mockResolvedValueOnce({ id: 'new-class-id' });
      const utils = renderScreen(mockApi);

      await waitFor(() => {
        expect(utils.getByText('Select Class Type')).toBeTruthy();
      });

      // Before selection — placeholder shown
      expect(utils.getByText('Select Class Type')).toBeTruthy();

      // Open dropdown and select second item
      fireEvent.press(utils.getByText('Select Class Type'));
      fireEvent.press(utils.getByText('Olympic Lifting'));

      // After selection — selected label shown
      expect(utils.getByText('Olympic Lifting')).toBeTruthy();
    });

    it('updates coachUserId when a coach is selected', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByText('Select Coach')).toBeTruthy();
      });

      fireEvent.press(utils.getByText('Select Coach'));
      fireEvent.press(utils.getByText('coach@example.com'));

      expect(utils.getByText('coach@example.com')).toBeTruthy();
    });

    it('updates spaceId when a space is selected', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByText('Select Space')).toBeTruthy();
      });

      fireEvent.press(utils.getByText('Select Space'));
      fireEvent.press(utils.getByText('Main Floor'));

      expect(utils.getByText('Main Floor')).toBeTruthy();
    });

    it('closes the dropdown after selection', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByText('Select Class Type')).toBeTruthy();
      });

      // Open and verify list items visible
      fireEvent.press(utils.getByText('Select Class Type'));
      expect(utils.getByText('CrossFit')).toBeTruthy();
      expect(utils.getByText('Olympic Lifting')).toBeTruthy();

      // Select and verify list items no longer rendered
      fireEvent.press(utils.getByText('CrossFit'));
      expect(utils.queryByText('Olympic Lifting')).toBeNull();
    });
  });
  // ── Desktop register ──────────────────────────────────────────────────────
  //
  // Mobile returns the bare form; desktop wraps it beside the OwnerSidebar. The
  // sidebar is genuinely desktop-only here, so it had no coverage at all.
  describe('desktop register', () => {
    beforeEach(() => {
      mockIsMobile = false;
    });

    it('mounts the owner sidebar beside the form', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByText('Create New Class')).toBeTruthy();
      });

      // Sidebar nav destinations — absent in the mobile register entirely.
      expect(utils.getByText('Members')).toBeTruthy();
      expect(utils.getByText('Coaches')).toBeTruthy();
      expect(utils.getByText('Settings')).toBeTruthy();
    });

    it('omits the mobile-only back button', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByText('Create New Class')).toBeTruthy();
      });

      expect(utils.queryByTestId('create-class-back-btn')).toBeNull();
    });

    it('renders every form control and both footer actions on desktop', async () => {
      const utils = renderScreen();

      await waitFor(() => {
        expect(utils.getByText('Create New Class')).toBeTruthy();
      });

      // The desktop branch re-lays out every row, so a dropped control would
      // only surface here. Cheap breadth over the whole form.
      expect(utils.getByTestId('create-class-date-input')).toBeTruthy();
      expect(utils.getByTestId('create-class-time-input')).toBeTruthy();
      expect(utils.getByTestId('create-class-class-type-picker')).toBeTruthy();
      expect(utils.getByTestId('create-class-coach-picker')).toBeTruthy();
      expect(utils.getByTestId('create-class-space-picker')).toBeTruthy();
      expect(utils.getByTestId('create-class-capacity-input')).toBeTruthy();
      expect(utils.getByTestId('create-class-duration-input')).toBeTruthy();
      expect(utils.getByTestId('create-class-save-btn')).toBeTruthy();
      expect(utils.getByTestId('create-class-cancel-btn')).toBeTruthy();
    });
  });
});
