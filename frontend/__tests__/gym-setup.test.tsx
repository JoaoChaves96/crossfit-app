import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import GymSetupScreen from '@/app/gym-setup';
import { AuthWrapper } from '@/test-utils/auth-wrapper';
import { createMockApiClient, type MockApiClient } from '@/test-utils/mock-api-client';

// ─── Module mocks ─────────────────────────────────────────────────────────────

// ApiError is kept real: the screen branches on `err instanceof ApiError`, so a
// stubbed class would make that check silently false and the 409 test would pass
// for the wrong reason.
jest.mock('@/utils/api-client', () => {
  const actual = jest.requireActual('@/utils/api-client');
  return { ...actual, createApiClient: jest.fn() };
});

import { ApiError, createApiClient } from '@/utils/api-client';
// jsdom's window is 750px — under the 768px breakpoint — so an unpinned suite
// only ever renders the mobile register. This wizard drops its step-rail labels
// on mobile, so those labels had no coverage; pin the register and opt in below.
let mockIsMobile = true;
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({ isMobile: mockIsMobile, isDesktop: !mockIsMobile, width: mockIsMobile ? 390 : 1280 }),
}));


const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

const mockSetCurrentGymId = jest.fn(() => Promise.resolve());

jest.mock('@/hooks/useGym', () => ({
  useGym: () => ({
    currentGymId: null,
    isLoading: false,
    setCurrentGymId: mockSetCurrentGymId,
  }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const GYM_ID = 'gym-new-1';

const CREATE_GYM_RESPONSE = {
  id: GYM_ID,
  name: 'CrossFit Downtown',
  location: '123 Main St',
  description: '',
  ownerId: 'test-user-id',
  createdAt: '2026-08-11T10:00:00.000Z',
  accessToken: 'fresh.jwt.token',
};

let api: MockApiClient;
const mockLogin = jest.fn(() => Promise.resolve());

function renderWizard() {
  return render(<GymSetupScreen />, {
    wrapper: ({ children }) => (
      <AuthWrapper value={{ token: 'stale-token', login: mockLogin }}>
        {children}
      </AuthWrapper>
    ),
  });
}

/** Fill step 1 and advance to step 2 (spaces). */
function goToSpaces(utils: ReturnType<typeof renderWizard>) {
  fireEvent.changeText(utils.getByTestId('gym-name-input'), 'CrossFit Downtown');
  fireEvent.changeText(utils.getByTestId('gym-location-input'), '123 Main St');
  fireEvent.press(utils.getByTestId('basics-next-btn'));
}

/** Fill one valid space and advance to step 3 (class types). */
function goToClassTypes(utils: ReturnType<typeof renderWizard>) {
  goToSpaces(utils);
  fireEvent.press(utils.getByTestId('add-space-btn'));
  fireEvent.changeText(utils.getByTestId('space-name-input-0'), 'Main Floor');
  fireEvent.changeText(utils.getByTestId('space-capacity-input-0'), '20');
  fireEvent.press(utils.getByTestId('spaces-next-btn'));
}

/** Fill one valid class type and advance to step 4 (review). */
function goToReview(utils: ReturnType<typeof renderWizard>) {
  goToClassTypes(utils);
  fireEvent.press(utils.getByTestId('add-class-type-btn'));
  fireEvent.changeText(utils.getByTestId('class-type-name-input-0'), 'WOD');
  fireEvent.press(utils.getByTestId('class-types-next-btn'));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsMobile = true;
  api = createMockApiClient();
  (createApiClient as jest.Mock).mockReturnValue(api);
});

// ─── Minimum configuration: at least one space ────────────────────────────────

describe('GymSetupScreen — spaces are required', () => {
  it('blocks Next while no space has been added', () => {
    const utils = renderWizard();
    goToSpaces(utils);

    expect(utils.getByTestId('spaces-empty-state')).toBeTruthy();
    fireEvent.press(utils.getByTestId('spaces-next-btn'));

    // Still on step 2: the empty-array loop used to pass vacuously and let the
    // owner reach a gym that could never schedule a class.
    expect(utils.getByTestId('spaces-step-error')).toBeTruthy();
    expect(utils.queryByText('Step 3: Class Types')).toBeNull();
  });

  it('advances once a valid space exists', () => {
    const utils = renderWizard();
    goToSpaces(utils);
    fireEvent.press(utils.getByTestId('add-space-btn'));
    fireEvent.changeText(utils.getByTestId('space-name-input-0'), 'Main Floor');
    fireEvent.changeText(utils.getByTestId('space-capacity-input-0'), '20');
    fireEvent.press(utils.getByTestId('spaces-next-btn'));

    expect(utils.getByText('Step 3: Class Types')).toBeTruthy();
  });

  it('still rejects a space row left blank', () => {
    const utils = renderWizard();
    goToSpaces(utils);
    fireEvent.press(utils.getByTestId('add-space-btn'));
    fireEvent.press(utils.getByTestId('spaces-next-btn'));

    // Per-row validation, not the empty-array guard.
    expect(utils.queryByTestId('spaces-step-error')).toBeNull();
    expect(utils.getByText('Name is required')).toBeTruthy();
    expect(utils.queryByText('Step 3: Class Types')).toBeNull();
  });

  it('clears the step error as soon as a space is added', () => {
    const utils = renderWizard();
    goToSpaces(utils);
    fireEvent.press(utils.getByTestId('spaces-next-btn'));
    expect(utils.getByTestId('spaces-step-error')).toBeTruthy();

    fireEvent.press(utils.getByTestId('add-space-btn'));

    expect(utils.queryByTestId('spaces-step-error')).toBeNull();
  });
});

// ─── Minimum configuration: at least one class type ───────────────────────────

describe('GymSetupScreen — class types are required', () => {
  it('blocks Next while no class type has been added', () => {
    const utils = renderWizard();
    goToClassTypes(utils);

    expect(utils.getByTestId('class-types-empty-state')).toBeTruthy();
    fireEvent.press(utils.getByTestId('class-types-next-btn'));

    expect(utils.getByTestId('class-types-step-error')).toBeTruthy();
    expect(utils.queryByText('Step 4: Review & Submit')).toBeNull();
  });

  it('advances once a valid class type exists', () => {
    const utils = renderWizard();
    goToClassTypes(utils);
    fireEvent.press(utils.getByTestId('add-class-type-btn'));
    fireEvent.changeText(utils.getByTestId('class-type-name-input-0'), 'WOD');
    fireEvent.press(utils.getByTestId('class-types-next-btn'));

    expect(utils.getByText('Step 4: Review & Submit')).toBeTruthy();
  });
});

// ─── Submit contract (the wiring from 1dcd683, previously untested) ───────────

describe('GymSetupScreen — submit', () => {
  it('creates the gym, then its spaces and class types', async () => {
    api.post
      .mockResolvedValueOnce(CREATE_GYM_RESPONSE) // POST /api/gyms
      .mockResolvedValueOnce({}) // space
      .mockResolvedValueOnce({}); // class type

    const utils = renderWizard();
    goToReview(utils);
    fireEvent.press(utils.getByTestId('create-gym-btn'));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(3));

    expect(api.post.mock.calls[0][0]).toBe('/api/gyms');
    expect(api.post.mock.calls[0][1]).toEqual({
      name: 'CrossFit Downtown',
      location: '123 Main St',
      description: '',
    });

    // baseCapacity is a number: the form holds capacity as a string and the DTO
    // rejects one.
    expect(api.post.mock.calls[1][0]).toBe(
      `/api/gyms/${GYM_ID}/configuration/spaces`,
    );
    expect(api.post.mock.calls[1][1]).toEqual({
      name: 'Main Floor',
      baseCapacity: 20,
    });

    // The class-types endpoint multiplexes create/update/delete, so the
    // operation is explicit.
    expect(api.post.mock.calls[2][0]).toBe(
      `/api/gyms/${GYM_ID}/configuration/class-types`,
    );
    expect(api.post.mock.calls[2][1]).toEqual({
      operation: 'create',
      name: 'WOD',
    });
  });

  it('adopts the re-signed token before configuring the gym', async () => {
    api.post
      .mockResolvedValueOnce(CREATE_GYM_RESPONSE)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const utils = renderWizard();
    goToReview(utils);
    fireEvent.press(utils.getByTestId('create-gym-btn'));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('fresh.jwt.token'));

    // The configuration calls must use the new token, not the one that predates
    // the gym and still claims gymId: null — GymOwnershipGuard rejects that.
    expect(createApiClient).toHaveBeenCalledWith({ token: 'fresh.jwt.token' });
  });

  it('shows the success screen after a successful create', async () => {
    api.post
      .mockResolvedValueOnce(CREATE_GYM_RESPONSE)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const utils = renderWizard();
    goToReview(utils);
    fireEvent.press(utils.getByTestId('create-gym-btn'));

    await waitFor(() => expect(utils.getByText('Gym Created!')).toBeTruthy());
    expect(
      utils.getByText('"CrossFit Downtown" has been successfully set up.'),
    ).toBeTruthy();
  });

  it('routes the owner to their own home, not the athlete surface', async () => {
    api.post
      .mockResolvedValueOnce(CREATE_GYM_RESPONSE)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const utils = renderWizard();
    goToReview(utils);
    fireEvent.press(utils.getByTestId('create-gym-btn'));

    await waitFor(() => expect(utils.getByTestId('setup-continue-btn')).toBeTruthy());
    fireEvent.press(utils.getByTestId('setup-continue-btn'));

    const target = mockRouter.push.mock.calls[0]?.[0] ?? mockRouter.replace.mock.calls[0]?.[0];
    expect(target).not.toContain('(tabs)');
  });

  it('populates GymContext so gym-scoped owner screens can fetch', async () => {
    // GymContext is otherwise only set by login. Left null, create-class's
    // pickers hang on "Loading…" and the dashboard shows an empty week.
    api.post
      .mockResolvedValueOnce(CREATE_GYM_RESPONSE)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const utils = renderWizard();
    goToReview(utils);
    fireEvent.press(utils.getByTestId('create-gym-btn'));

    await waitFor(() => expect(mockSetCurrentGymId).toHaveBeenCalledWith(GYM_ID));
  });

  it('offers a first class the owner can now coach themselves', async () => {
    // A new gym has no coach on staff, but the owner may be assigned as one
    // (DECISIONS.md, "Owners as Coaches"), so this CTA is submittable.
    api.post
      .mockResolvedValueOnce(CREATE_GYM_RESPONSE)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const utils = renderWizard();
    goToReview(utils);
    fireEvent.press(utils.getByTestId('create-gym-btn'));

    await waitFor(() => expect(utils.getByTestId('setup-continue-btn')).toBeTruthy());
    expect(utils.getByText('Create Your First Class')).toBeTruthy();
    expect(utils.getByText(/coach it yourself/)).toBeTruthy();
  });

  it('routes to create-class from the success screen', async () => {
    api.post
      .mockResolvedValueOnce(CREATE_GYM_RESPONSE)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const utils = renderWizard();
    goToReview(utils);
    fireEvent.press(utils.getByTestId('create-gym-btn'));

    await waitFor(() => expect(utils.getByTestId('setup-create-class-btn')).toBeTruthy());
    fireEvent.press(utils.getByTestId('setup-create-class-btn'));

    expect(mockRouter.replace).toHaveBeenCalledWith('/create-class');
  });

  it('explains a 409 instead of surfacing the raw response', async () => {
    // One gym per owner — retrying can never succeed.
    api.post.mockRejectedValueOnce(
      new ApiError(409, '{"message":"This user already owns a gym"}'),
    );

    const utils = renderWizard();
    goToReview(utils);
    fireEvent.press(utils.getByTestId('create-gym-btn'));

    await waitFor(() => expect(utils.getByTestId('submit-error')).toBeTruthy());
    expect(utils.getByTestId('submit-error').props.children).toBe(
      'This account already owns a gym. Log out and back in to open it.',
    );
    // No configuration calls after a failed create.
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('re-enables the Create button after a failure', async () => {
    api.post.mockRejectedValueOnce(new ApiError(409, 'conflict'));

    const utils = renderWizard();
    goToReview(utils);
    fireEvent.press(utils.getByTestId('create-gym-btn'));

    await waitFor(() => expect(utils.getByTestId('submit-error')).toBeTruthy());

    // The 409 branch returns early; `finally` must still clear isSubmitting or
    // the wizard would be stuck in a loading state.
    api.post.mockResolvedValueOnce(CREATE_GYM_RESPONSE).mockResolvedValue({});
    fireEvent.press(utils.getByTestId('create-gym-btn'));

    await waitFor(() => expect(api.post.mock.calls.length).toBeGreaterThan(1));
  });

  it('sends the gym without an unauthenticated call when there is no token', () => {
    const utils = render(<GymSetupScreen />, {
      wrapper: ({ children }) => (
        <AuthWrapper value={{ token: null }}>{children}</AuthWrapper>
      ),
    });
    goToReview(utils);
    fireEvent.press(utils.getByTestId('create-gym-btn'));

    expect(api.post).not.toHaveBeenCalled();
    expect(utils.getByTestId('submit-error')).toBeTruthy();
  });
});

// ─── Cancel ───────────────────────────────────────────────────────────────────

describe('GymSetupScreen — cancel', () => {
  it('replaces rather than pops, since the wizard is deep-linkable', () => {
    const utils = renderWizard();
    fireEvent.press(utils.getByTestId('basics-cancel-btn'));

    // router.back() would do nothing when there is no history to pop.
    expect(mockRouter.replace).toHaveBeenCalledWith('/no-gym');
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});

// ─── Desktop register ─────────────────────────────────────────────────────────

// The step rail carries text labels on desktop and collapses to numbered
// circles on mobile (so it survives 320pt). The labelled variant had no
// coverage, and the whole wizard flow was only ever exercised at mobile width.
describe('GymSetupScreen — desktop register', () => {
  beforeEach(() => {
    mockIsMobile = false;
  });

  it('labels each step in the rail', () => {
    const utils = renderWizard();

    // Mobile renders these as numerals only; the accessibility label carries the
    // name in both registers, so assert the visible text specifically.
    expect(utils.getByText('Basics')).toBeTruthy();
    expect(utils.getByText('Spaces')).toBeTruthy();
    expect(utils.getByText('Class Types')).toBeTruthy();
    expect(utils.getByText('Review')).toBeTruthy();
  });

  it('still enforces the minimum-configuration gate on desktop', () => {
    const utils = renderWizard();
    goToSpaces(utils);

    // The gate is shared logic, but it renders through the desktop action stack.
    fireEvent.press(utils.getByTestId('spaces-next-btn'));
    expect(utils.getByTestId('spaces-step-error')).toBeTruthy();
  });

  it('walks the full wizard to the review step on desktop', () => {
    const utils = renderWizard();
    goToReview(utils);

    // Every step's desktop layout has to render for this to arrive at Review.
    expect(utils.getByTestId('create-gym-btn')).toBeTruthy();
  });
});
