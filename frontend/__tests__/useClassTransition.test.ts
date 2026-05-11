import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useClassTransition } from '@/app/class-management/useClassTransition';
import { createMockApiClient } from '@/test-utils/mock-api-client';

// Mock the api-client module so useClassTransition uses our controllable mock
const mockApiClient = createMockApiClient();

jest.mock('@/utils/api-client', () => ({
  createApiClient: jest.fn(() => mockApiClient),
}));

// Capture Alert.alert calls so we can programmatically trigger button handlers
jest.spyOn(Alert, 'alert');

type AlertButton = { text?: string; onPress?: () => void | Promise<void>; style?: string };

function getAlertButton(buttonText: string): AlertButton {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  if (calls.length === 0) {
    throw new Error(`Alert.alert was never called`);
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

function buildClassDetail(overrides?: Partial<{ state: string }>) {
  return {
    id: 'class-123',
    state: 'published',
    gymId: 'gym-abc',
    name: 'Morning WOD',
    coachId: 'coach-1',
    classTypeId: 'ct-1',
    scheduledAt: '2026-05-06T08:00:00Z',
    capacity: 10,
    bookedCount: 2,
    ...overrides,
  } as Parameters<typeof useClassTransition>[0]['classDetail'];
}

function buildParams(
  overrides?: Partial<Parameters<typeof useClassTransition>[0]>
): Parameters<typeof useClassTransition>[0] {
  return {
    classDetail: buildClassDetail(),
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
    it('shows an Alert.alert before any API call when handleTransition is called', () => {
      // Arrange
      const params = buildParams();
      const { result } = renderHook(() => useClassTransition(params));

      // Act
      act(() => {
        result.current.handleTransition();
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledTimes(1);
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
      const buttons: AlertButton[] = (Alert.alert as jest.Mock).mock.calls[0][2];
      const texts = buttons.map((b) => b.text);
      expect(texts).toContain('Cancel');
      expect(texts).toContain('Confirm');
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
    it('shows an error Alert when the API call rejects', async () => {
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

      // Assert — Alert.alert called a second time for the error
      expect(Alert.alert).toHaveBeenCalledTimes(2);
      const [errorTitle, errorMessage] = (Alert.alert as jest.Mock).mock.calls[1];
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
    it('does not open an alert when classDetail is null', () => {
      // Arrange
      const params = buildParams({ classDetail: null });
      const { result } = renderHook(() => useClassTransition(params));

      // Act
      act(() => {
        result.current.handleTransition();
      });

      // Assert
      expect(Alert.alert).not.toHaveBeenCalled();
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
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('does not open an alert for an archived class (no next state)', () => {
      // Arrange
      const params = buildParams({ classDetail: buildClassDetail({ state: 'archived' }) });
      const { result } = renderHook(() => useClassTransition(params));

      // Act
      act(() => {
        result.current.handleTransition();
      });

      // Assert
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });
});
