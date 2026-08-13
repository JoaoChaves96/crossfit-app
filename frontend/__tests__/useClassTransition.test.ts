import { renderHook, act } from '@testing-library/react-native';
import { showConfirm, showError } from '@/utils/alert';
import { useClassTransition } from '@/app/class-management/useClassTransition';
import { createMockApiClient } from '@/test-utils/mock-api-client';

// Mock the api-client module so useClassTransition uses our controllable mock
const mockApiClient = createMockApiClient();

jest.mock('@/utils/api-client', () => ({
  createApiClient: jest.fn(() => mockApiClient),
}));

// Asserted against the app's own cross-platform wrapper, NOT react-native's
// Alert. react-native-web implements Alert as `static alert() {}` — a literal
// no-op — so a hook that called it directly did nothing at all on web while a
// test spying on Alert.alert stayed green. The wrapper is the contract.
jest.mock('@/utils/alert', () => ({
  showConfirm: jest.fn(),
  showError: jest.fn(),
}));

type AlertButton = { text?: string; onPress?: () => void | Promise<void>; style?: string };

function getAlertButton(buttonText: string): AlertButton {
  const calls = (showConfirm as jest.Mock).mock.calls;
  if (calls.length === 0) {
    throw new Error(`showConfirm was never called`);
  }
  const lastCall = calls[calls.length - 1];
  const buttons: AlertButton[] = lastCall[2] ?? [];
  const button = buttons.find((b) => b.text === buttonText);
  if (!button) {
    throw new Error(
      `No button with text "${buttonText}" found. Available: ${buttons.map((b) => b.text).join(', ')}`
    );
  }
  return button;
}

function buildParams(
  overrides?: Partial<Parameters<typeof useClassTransition>[0]>
): Parameters<typeof useClassTransition>[0] {
  return {
    state: 'published',
    token: 'test-token',
    currentGymId: 'gym-abc',
    classId: 'class-123',
    onTransitionSuccess: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApiClient.post.mockResolvedValue({});
});

describe('useClassTransition', () => {
  describe('handleTransition — confirmation alert', () => {
    it('shows a confirmation before any API call when handleTransition is called', () => {
      // Arrange
      const params = buildParams();
      const { result } = renderHook(() => useClassTransition(params));

      // Act
      act(() => {
        result.current.handleTransition();
      });

      // Assert
      expect(showConfirm).toHaveBeenCalledTimes(1);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('presents both Cancel and Confirm buttons in the alert', () => {
      // Arrange
      const params = buildParams();
      const { result } = renderHook(() => useClassTransition(params));

      // Act
      act(() => {
        result.current.handleTransition();
      });

      // Assert
      const buttons: AlertButton[] = (showConfirm as jest.Mock).mock.calls[0][2];
      const texts = buttons.map((b) => b.text);
      expect(texts).toContain('Cancel');
      expect(texts).toContain('Confirm');

      // The web branch of showConfirm picks the handler to run by STYLE — it
      // looks for 'destructive' or 'default' and silently does nothing if
      // neither is present. An unstyled Confirm is therefore a dead button on
      // web, which is exactly the shape of the bug this file used to miss.
      expect(buttons.find((b) => b.text === 'Confirm')?.style).toBe('default');
      expect(buttons.find((b) => b.text === 'Cancel')?.style).toBe('cancel');
    });
  });

  describe('on Confirm', () => {
    it('calls the transition API endpoint with correct gym id and class id', async () => {
      // Arrange
      const params = buildParams();
      const { result } = renderHook(() => useClassTransition(params));

      // Act
      act(() => {
        result.current.handleTransition();
      });
      const confirmButton = getAlertButton('Confirm');
      await act(async () => {
        await confirmButton.onPress?.();
      });

      // Assert
      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/api/gyms/gym-abc/classes/class-123/transition`,
        expect.objectContaining({ classId: 'class-123', targetState: 'booking_closed' })
      );
    });

    it('calls onTransitionSuccess after a successful API response', async () => {
      // Arrange
      const onTransitionSuccess = jest.fn();
      const params = buildParams({ onTransitionSuccess });
      const { result } = renderHook(() => useClassTransition(params));

      // Act
      act(() => {
        result.current.handleTransition();
      });
      const confirmButton = getAlertButton('Confirm');
      await act(async () => {
        await confirmButton.onPress?.();
      });

      // Assert
      expect(onTransitionSuccess).toHaveBeenCalledTimes(1);
    });

    it('sets isTransitioning to false after a successful API response', async () => {
      // Arrange
      let resolvePost!: (value: unknown) => void;
      mockApiClient.post.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePost = resolve;
        })
      );
      const params = buildParams();
      const { result } = renderHook(() => useClassTransition(params));

      // Act — trigger transition
      act(() => {
        result.current.handleTransition();
      });
      const confirmButton = getAlertButton('Confirm');
      // Start the async confirm
      const confirmPromise = act(async () => {
        await confirmButton.onPress?.();
      });
      // Resolve the pending post
      act(() => {
        resolvePost({});
      });
      await confirmPromise;

      // Assert
      expect(result.current.isTransitioning).toBe(false);
    });
  });

  describe('on Cancel', () => {
    it('does not call the API when Cancel is pressed', () => {
      // Arrange
      const params = buildParams();
      const { result } = renderHook(() => useClassTransition(params));

      // Act
      act(() => {
        result.current.handleTransition();
      });
      const cancelButton = getAlertButton('Cancel');
      act(() => {
        cancelButton.onPress?.();
      });

      // Assert
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('does not call onTransitionSuccess when Cancel is pressed', () => {
      // Arrange
      const onTransitionSuccess = jest.fn();
      const params = buildParams({ onTransitionSuccess });
      const { result } = renderHook(() => useClassTransition(params));

      // Act
      act(() => {
        result.current.handleTransition();
      });
      const cancelButton = getAlertButton('Cancel');
      act(() => {
        cancelButton.onPress?.();
      });

      // Assert
      expect(onTransitionSuccess).not.toHaveBeenCalled();
    });
  });

  describe('on API error', () => {
    it('shows an error when the API call rejects', async () => {
      // Arrange
      mockApiClient.post.mockRejectedValueOnce(new Error('Network failure'));
      const params = buildParams();
      const { result } = renderHook(() => useClassTransition(params));

      // Act
      act(() => {
        result.current.handleTransition();
      });
      const confirmButton = getAlertButton('Confirm');
      await act(async () => {
        await confirmButton.onPress?.();
      });

      // Assert — the failure is surfaced, and through showError so it is visible
      // on web too rather than swallowed by the no-op Alert.
      expect(showError).toHaveBeenCalledTimes(1);
      const [errorTitle, errorMessage] = (showError as jest.Mock).mock.calls[0];
      expect(errorTitle).toBe('Error');
      expect(errorMessage).toBe('Network failure');
    });

    it('does not call onTransitionSuccess when the API call rejects', async () => {
      // Arrange
      mockApiClient.post.mockRejectedValueOnce(new Error('Network failure'));
      const onTransitionSuccess = jest.fn();
      const params = buildParams({ onTransitionSuccess });
      const { result } = renderHook(() => useClassTransition(params));

      // Act
      act(() => {
        result.current.handleTransition();
      });
      const confirmButton = getAlertButton('Confirm');
      await act(async () => {
        await confirmButton.onPress?.();
      });

      // Assert
      expect(onTransitionSuccess).not.toHaveBeenCalled();
    });

    it('sets isTransitioning to false after an API error', async () => {
      // Arrange
      mockApiClient.post.mockRejectedValueOnce(new Error('Network failure'));
      const params = buildParams();
      const { result } = renderHook(() => useClassTransition(params));

      // Act
      act(() => {
        result.current.handleTransition();
      });
      const confirmButton = getAlertButton('Confirm');
      await act(async () => {
        await confirmButton.onPress?.();
      });

      // Assert
      expect(result.current.isTransitioning).toBe(false);
    });
  });

  describe('guard conditions', () => {
    it('does not open an alert when the state is not yet known', () => {
      // Arrange
      const params = buildParams({ state: null });
      const { result } = renderHook(() => useClassTransition(params));

      // Act
      act(() => {
        result.current.handleTransition();
      });

      // Assert
      expect(showConfirm).not.toHaveBeenCalled();
    });

    it('does not open an alert when token is null', () => {
      // Arrange
      const params = buildParams({ token: null });
      const { result } = renderHook(() => useClassTransition(params));

      // Act
      act(() => {
        result.current.handleTransition();
      });

      // Assert
      expect(showConfirm).not.toHaveBeenCalled();
    });

    it('does not open an alert for an archived class (no next state)', () => {
      // Arrange
      const params = buildParams({ state: 'archived' });
      const { result } = renderHook(() => useClassTransition(params));

      // Act
      act(() => {
        result.current.handleTransition();
      });

      // Assert
      expect(showConfirm).not.toHaveBeenCalled();
    });
  });
});
